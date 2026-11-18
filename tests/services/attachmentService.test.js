// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listAttachments,
  removeAttachment,
  uploadAttachment,
} from '../../src/services/attachmentService.js';
import { startDemoSession } from '../../src/services/authService.js';
import { annulFollowUp } from '../../src/services/followUpService.js';
import { addFollowUp } from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { ATTACHMENT_MAX_BYTES } from '../../src/utils/attachments.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const ANNULLED = 'f0110000-0000-5000-8000-000100000008';
const SEED_ATTACHMENT = 'a7706adb-9b79-5499-a6f3-bdce777c77a6';

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const PDF = [...'%PDF-1.7'].map((char) => char.charCodeAt(0));

function file(name, bytes, type = '') {
  return new File([Uint8Array.from(bytes)], name, { type });
}

async function uploadMany(count) {
  for (let index = 0; index < count; index += 1) {
    await uploadAttachment(LAST_VITAL_SIGNS, file(`foto-${index}.jpg`, JPEG));
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listAttachments', () => {
  it('lista os anexos ativos do registro, na ordem de envio', async () => {
    await startDemoSession('professional');

    const { data } = await listAttachments(LAST_VITAL_SIGNS);

    expect(data.map((attachment) => attachment.fileName)).toEqual([
      'receita-medica.pdf',
    ]);
    expect(data[0]).toMatchObject({
      followUpId: LAST_VITAL_SIGNS,
      contentType: 'application/pdf',
      uploadedBy: { name: 'Rosângela Prado' },
    });
  });

  it('responde 404 à familiar para registro anulado', async () => {
    await startDemoSession('family');

    await expect(listAttachments(ANNULLED)).rejects.toMatchObject({
      status: 404,
      code: 'FOLLOW_UP_NOT_FOUND',
    });
  });
});

describe('uploadAttachment', () => {
  it('aceita da cuidadora autora o arquivo reconhecido pelo conteúdo, com o nome saneado', async () => {
    await startDemoSession('caregiver');

    const { data } = await uploadAttachment(
      LAST_VITAL_SIGNS,
      file('C:\\fotos\\curativo.jpg', JPEG, 'image/jpeg'),
    );
    const list = await listAttachments(LAST_VITAL_SIGNS);

    expect(data).toMatchObject({
      followUpId: LAST_VITAL_SIGNS,
      fileName: 'curativo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: JPEG.length,
      uploadedBy: { name: 'Rosângela Prado' },
      uploadedAt: NOW.toISOString(),
    });
    expect(list.data.map((attachment) => attachment.fileName)).toEqual([
      'receita-medica.pdf',
      'curativo.jpg',
    ]);
  });

  it('recusa conteúdo fora dos quatro tipos, arquivo vazio e acima de 10 MiB', async () => {
    await startDemoSession('caregiver');
    const text = [...'não sou imagem'].map((char) => char.charCodeAt(0));

    await expect(
      uploadAttachment(LAST_VITAL_SIGNS, file('foto.jpg', text, 'image/jpeg')),
    ).rejects.toMatchObject({
      status: 415,
      code: 'ATTACHMENT_UNSUPPORTED_TYPE',
    });
    await expect(
      uploadAttachment(LAST_VITAL_SIGNS, file('vazio.pdf', [])),
    ).rejects.toMatchObject({ status: 422, code: 'ATTACHMENT_EMPTY' });
    await expect(
      uploadAttachment(
        LAST_VITAL_SIGNS,
        new File([new Uint8Array(ATTACHMENT_MAX_BYTES + 1)], 'grande.pdf'),
      ),
    ).rejects.toMatchObject({ status: 413, code: 'ATTACHMENT_TOO_LARGE' });
  });

  it('para no quinto anexo ativo e libera a vaga com a remoção', async () => {
    await startDemoSession('caregiver');
    await uploadMany(4);

    await expect(
      uploadAttachment(LAST_VITAL_SIGNS, file('receita.pdf', PDF)),
    ).rejects.toMatchObject({ status: 409, code: 'ATTACHMENT_LIMIT_REACHED' });
    await removeAttachment(LAST_VITAL_SIGNS, SEED_ATTACHMENT);
    const { data } = await uploadAttachment(
      LAST_VITAL_SIGNS,
      file('receita.pdf', PDF),
    );
    expect(data.contentType).toBe('application/pdf');
  });

  it('recusa registro anulado, registro de outra autora e quem não é cuidador', async () => {
    await startDemoSession('caregiver');
    await annulFollowUp(LAST_VITAL_SIGNS, { reason: 'Paciente errado' });
    addFollowUp({
      id: 'f0120000-0000-5000-8000-000000000099',
      patientId: '0b639b83-76d0-570a-9017-7b6263d892cf',
      form: {
        id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
        name: 'Sinais vitais',
        versionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
        versionNumber: 1,
      },
      author: {
        id: '485ba72b-e202-54ed-9f38-2294a18e1d29',
        name: 'Juliana Bastos',
      },
      visitedAt: '2026-11-10T10:00:00.000Z',
      submittedAt: '2026-11-10T10:05:00.000Z',
      notes: null,
      status: 'valid',
      annulment: null,
      answers: [],
    });

    await expect(
      uploadAttachment(LAST_VITAL_SIGNS, file('foto.jpg', JPEG)),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ATTACHMENT_FOLLOW_UP_ANNULLED',
    });
    await expect(
      uploadAttachment(
        'f0120000-0000-5000-8000-000000000099',
        file('foto.jpg', JPEG),
      ),
    ).rejects.toMatchObject({ status: 403, code: 'ATTACHMENT_NOT_AUTHOR' });

    await startDemoSession('professional');
    await expect(
      uploadAttachment(LAST_VITAL_SIGNS, file('foto.jpg', JPEG)),
    ).rejects.toMatchObject({ status: 403, code: 'AUTH_FORBIDDEN' });
  });
});

describe('removeAttachment', () => {
  it('deixa o profissional remover qualquer anexo, uma vez só', async () => {
    await startDemoSession('professional');

    await removeAttachment(LAST_VITAL_SIGNS, SEED_ATTACHMENT);
    const { data } = await listAttachments(LAST_VITAL_SIGNS);

    expect(data).toEqual([]);
    await expect(
      removeAttachment(LAST_VITAL_SIGNS, SEED_ATTACHMENT),
    ).rejects.toMatchObject({ status: 404, code: 'ATTACHMENT_NOT_FOUND' });
  });

  it('recusa a familiar', async () => {
    await startDemoSession('family');

    await expect(
      removeAttachment(LAST_VITAL_SIGNS, SEED_ATTACHMENT),
    ).rejects.toMatchObject({ status: 403, code: 'AUTH_FORBIDDEN' });
  });
});

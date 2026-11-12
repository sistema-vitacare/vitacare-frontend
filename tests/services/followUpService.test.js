// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDemoSession } from '../../src/services/authService.js';
import {
  annulFollowUp,
  createFollowUp,
  getFollowUp,
  listFollowUps,
} from '../../src/services/followUpService.js';
import { addFollowUp } from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { deactivatePatient } from '../../src/services/patientService.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const DAILY_FORM = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';
const TRIAGE_FORM = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';
const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const ANNULLED = 'f0110000-0000-5000-8000-000100000008';
const IOLANDA_RECORD = 'f0110000-0000-5000-8000-000500000000';
const JULIANA = {
  id: '485ba72b-e202-54ed-9f38-2294a18e1d29',
  name: 'Juliana Bastos',
};

// Sinais vitais, versão 1: sistólica e diastólica obrigatórias.
const VITAL_SIGNS = {
  formId: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
  formVersionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
};
const SYSTOLIC = '3c44a6a8-5472-5c65-ad6a-42a6a946740e';
const DIASTOLIC = '9570caa1-28fc-5e06-8327-bac0266a6c63';
const TEMPERATURE = 'e377f94a-6ab7-57f3-bc6a-764be9eda284';

function visit(overrides = {}) {
  return {
    patientId: DIRCE,
    ...VITAL_SIGNS,
    visitedAt: '2026-11-10T14:40:00.000Z',
    notes: ' Paciente com dor de cabeça. ',
    answers: [
      { fieldId: SYSTOLIC, value: 172 },
      { fieldId: DIASTOLIC, value: 95 },
      { fieldId: TEMPERATURE, value: null },
    ],
    ...overrides,
  };
}

// Registro de outra cuidadora num paciente de Rosângela, para conferir a
// autoria; os dados simulados não têm esse caso.
function otherAuthorRecord() {
  const record = {
    id: 'f0120000-0000-5000-8000-000000000099',
    patientId: DIRCE,
    form: {
      id: VITAL_SIGNS.formId,
      name: 'Sinais vitais',
      versionId: VITAL_SIGNS.formVersionId,
      versionNumber: 1,
    },
    author: JULIANA,
    visitedAt: '2026-11-10T10:00:00.000Z',
    submittedAt: '2026-11-10T10:05:00.000Z',
    notes: null,
    status: 'valid',
    annulment: null,
    answers: [],
  };
  addFollowUp(record);
  return record;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listFollowUps', () => {
  it('lista os registros do paciente, do mais recente ao mais antigo, com os anulados', async () => {
    await startDemoSession('professional');

    const { data, meta } = await listFollowUps({ patientId: DIRCE });

    expect(meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 28,
      totalPages: 2,
    });
    expect(data[0].visitedAt).toBe('2026-11-09T12:30:00.000Z');
    expect(data[0].visitedAt > data[1].visitedAt).toBe(true);
    const all = await listFollowUps({ patientId: DIRCE, limit: 100 });
    expect(all.data.filter((item) => item.status === 'annulled')).toHaveLength(
      1,
    );
  });

  it('esconde da familiar o registro anulado', async () => {
    await startDemoSession('family');

    const { meta } = await listFollowUps({ patientId: DIRCE });
    const annulled = await listFollowUps({
      patientId: DIRCE,
      status: 'annulled',
    });

    expect(meta.pagination.total).toBe(27);
    expect(annulled.data).toEqual([]);
  });

  it('filtra por situação, formulário, autor e período', async () => {
    await startDemoSession('professional');

    const annulled = await listFollowUps({
      patientId: DIRCE,
      status: 'annulled',
    });
    const daily = await listFollowUps({ patientId: DIRCE, formId: DAILY_FORM });
    const byAuthor = await listFollowUps({
      patientId: DIRCE,
      authorUserId: JULIANA.id,
    });
    const lastWeek = await listFollowUps({
      patientId: DIRCE,
      from: '2026-11-03',
      to: '2026-11-09',
    });

    expect(annulled.meta.pagination.total).toBe(1);
    expect(daily.meta.pagination.total).toBe(14);
    expect(byAuthor.data).toEqual([]);
    expect(lastWeek.data.map((item) => item.visitedAt.slice(0, 10))).toEqual([
      '2026-11-09',
      '2026-11-08',
      '2026-11-06',
      '2026-11-05',
      '2026-11-03',
    ]);
  });

  it('responde 404 para paciente fora do alcance', async () => {
    await startDemoSession('family');

    await expect(listFollowUps({ patientId: OSVALDO })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('getFollowUp', () => {
  it('devolve o registro com formulário, versão, autor e respostas', async () => {
    await startDemoSession('professional');

    const { data } = await getFollowUp(LAST_VITAL_SIGNS);

    expect(data).toMatchObject({
      patientId: DIRCE,
      form: { name: 'Sinais vitais', versionNumber: 1 },
      author: { name: 'Rosângela Prado' },
      status: 'valid',
    });
    expect(data.answers).toHaveLength(5);
  });

  it('responde 404 ao anulado para a familiar e ao registro de paciente fora do alcance', async () => {
    await startDemoSession('family');
    await expect(getFollowUp(ANNULLED)).rejects.toMatchObject({
      status: 404,
      code: 'FOLLOW_UP_NOT_FOUND',
    });

    await startDemoSession('caregiver');
    await expect(getFollowUp(IOLANDA_RECORD)).rejects.toMatchObject({
      status: 404,
      code: 'FOLLOW_UP_NOT_FOUND',
    });
  });
});

describe('createFollowUp', () => {
  it('grava o registro da cuidadora só com os campos preenchidos, na ordem dos campos', async () => {
    await startDemoSession('caregiver');

    const { data } = await createFollowUp(visit());
    const list = await listFollowUps({ patientId: DIRCE });

    expect(data).toMatchObject({
      patientId: DIRCE,
      form: { id: VITAL_SIGNS.formId, versionNumber: 1 },
      author: { name: 'Rosângela Prado' },
      visitedAt: '2026-11-10T14:40:00.000Z',
      submittedAt: NOW.toISOString(),
      notes: 'Paciente com dor de cabeça.',
      status: 'valid',
      annulment: null,
    });
    expect(
      data.answers.map((answer) => [answer.name, answer.value, answer.unit]),
    ).toEqual([
      ['Pressão sistólica', 172, 'mmHg'],
      ['Pressão diastólica', 95, 'mmHg'],
    ]);
    expect(list.meta.pagination.total).toBe(29);
    expect(list.data[0].id).toBe(data.id);
  });

  it('usa agora como hora da visita e tolera até 5 minutos à frente', async () => {
    await startDemoSession('caregiver');

    const now = await createFollowUp(visit({ visitedAt: undefined }));
    await expect(
      createFollowUp(visit({ visitedAt: '2026-11-10T15:06:00.000Z' })),
    ).rejects.toMatchObject({
      status: 422,
      code: 'FOLLOW_UP_INVALID_VISITED_AT',
      fields: [{ field: 'visitedAt', code: 'IN_FUTURE' }],
    });
    const tolerated = await createFollowUp(
      visit({ visitedAt: '2026-11-10T15:04:00.000Z' }),
    );

    expect(now.data.visitedAt).toBe(NOW.toISOString());
    expect(tolerated.data.visitedAt).toBe('2026-11-10T15:04:00.000Z');
  });

  it('recusa o envio sem nenhum valor e o obrigatório ausente', async () => {
    await startDemoSession('caregiver');

    await expect(
      createFollowUp(
        visit({ answers: [{ fieldId: TEMPERATURE, value: null }] }),
      ),
    ).rejects.toMatchObject({ status: 422, code: 'FOLLOW_UP_EMPTY' });
    await expect(
      createFollowUp(visit({ answers: [{ fieldId: DIASTOLIC, value: 80 }] })),
    ).rejects.toMatchObject({
      code: 'FOLLOW_UP_INVALID_ANSWERS',
      fields: [
        {
          field: `answers.${SYSTOLIC}`,
          code: 'REQUIRED',
          message: 'Pressão sistólica é obrigatório.',
        },
      ],
    });
  });

  it('recusa formulário que não vale para o paciente, desativado ou com versão antiga', async () => {
    await startDemoSession('caregiver');

    await expect(
      createFollowUp(
        visit({
          patientId: CLEUSA,
          formId: DAILY_FORM,
          formVersionId: '55e6672a-f0d5-5f0c-a94a-dfd6ec3c5cab',
        }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: 'FOLLOW_UP_FORM_NOT_APPLICABLE',
    });
    await expect(
      createFollowUp(visit({ formId: TRIAGE_FORM })),
    ).rejects.toMatchObject({ status: 409, code: 'FORM_INACTIVE' });
    await expect(
      createFollowUp(
        visit({ formVersionId: '00000000-0000-4000-8000-000000000000' }),
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'FOLLOW_UP_FORM_VERSION_OUTDATED',
    });
  });

  it('recusa paciente sem vínculo com a cuidadora e paciente inativo', async () => {
    await startDemoSession('caregiver');
    await expect(
      createFollowUp(visit({ patientId: IOLANDA })),
    ).rejects.toMatchObject({ status: 404, code: 'PATIENT_NOT_FOUND' });

    await startDemoSession('professional');
    await deactivatePatient(DIRCE);
    await startDemoSession('caregiver');

    await expect(createFollowUp(visit())).rejects.toMatchObject({
      status: 409,
      code: 'FOLLOW_UP_PATIENT_INACTIVE',
    });
  });

  it('só a cuidadora registra acompanhamento', async () => {
    await startDemoSession('professional');

    await expect(createFollowUp(visit())).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('annulFollowUp', () => {
  it('anula com motivo, uma vez só, e o anulado continua no histórico', async () => {
    await startDemoSession('professional');

    const { data } = await annulFollowUp(LAST_VITAL_SIGNS, {
      reason: '  Manguito errado.  ',
    });
    const list = await listFollowUps({ patientId: DIRCE, status: 'annulled' });

    expect(data).toMatchObject({
      status: 'annulled',
      annulment: {
        annulledAt: NOW.toISOString(),
        annulledBy: { name: 'Rafael Moura Brandão' },
        reason: 'Manguito errado.',
      },
    });
    expect(list.meta.pagination.total).toBe(2);
    await expect(
      annulFollowUp(LAST_VITAL_SIGNS, { reason: 'De novo' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'FOLLOW_UP_ALREADY_ANNULLED',
    });
  });

  it('deixa a cuidadora anular só o registro que ela fez', async () => {
    await startDemoSession('caregiver');
    const other = otherAuthorRecord();

    await expect(
      annulFollowUp(other.id, { reason: 'Não fui eu' }),
    ).rejects.toMatchObject({ status: 403, code: 'FOLLOW_UP_NOT_AUTHOR' });
    const own = await annulFollowUp(LAST_VITAL_SIGNS, {
      reason: 'Paciente errado',
    });
    expect(own.data.status).toBe('annulled');
  });

  it('exige motivo de 1 a 500 caracteres e recusa a familiar', async () => {
    await startDemoSession('professional');
    await expect(
      annulFollowUp(LAST_VITAL_SIGNS, { reason: '   ' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    await expect(
      annulFollowUp(LAST_VITAL_SIGNS, { reason: 'a'.repeat(501) }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });

    await startDemoSession('family');
    await expect(
      annulFollowUp(LAST_VITAL_SIGNS, { reason: 'Motivo' }),
    ).rejects.toMatchObject({ status: 403, code: 'AUTH_FORBIDDEN' });
  });
});

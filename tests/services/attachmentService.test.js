import { afterEach, describe, expect, it } from 'vitest';
import {
  downloadAttachment,
  listAttachments,
  removeAttachment,
  uploadAttachment,
} from '../../src/services/attachmentService.js';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  apiFailure,
  apiFile,
  apiPage,
  apiStub,
  reply,
} from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const FOLLOW_UP_ID = 'f0110000-0000-5000-8000-000100000013';
const ATTACHMENT_ID = 'a7700000-0000-5000-8000-000000000001';
const TOKEN = `token-${demoUser('caregiver').id}`;
const ATTACHMENT = {
  id: ATTACHMENT_ID,
  followUpId: FOLLOW_UP_ID,
  fileName: 'curativo.png',
};
const CONTENT = 'GET /follow-ups/:followUpId/attachments/:attachmentId/content';

async function signIn() {
  await login(credentialsFor('caregiver'));
}

afterEach(() => {
  resetMockState();
});

describe('attachmentService', () => {
  it('lista, envia em multipart e remove pelas rotas de anexo, com o token da sessão', async () => {
    await signIn();
    apiStub().use({
      'GET /follow-ups/:followUpId/attachments': () => apiPage([ATTACHMENT]),
      'POST /follow-ups/:followUpId/attachments': () =>
        reply(201, { data: ATTACHMENT, meta: {} }),
      'DELETE /follow-ups/:followUpId/attachments/:attachmentId': () =>
        reply(204, null),
    });
    const file = new File(['x'], 'curativo.png', { type: 'image/png' });

    const { data } = await listAttachments(FOLLOW_UP_ID);
    await uploadAttachment(FOLLOW_UP_ID, file);
    await removeAttachment(FOLLOW_UP_ID, ATTACHMENT_ID);

    expect(data).toEqual([ATTACHMENT]);
    expect(
      apiStub().last('GET /follow-ups/:followUpId/attachments'),
    ).toMatchObject({ params: { followUpId: FOLLOW_UP_ID }, token: TOKEN });
    const sent = apiStub().last('POST /follow-ups/:followUpId/attachments');
    expect(sent.params).toEqual({ followUpId: FOLLOW_UP_ID });
    expect(sent.body.get('file')).toEqual(file);
    expect(
      apiStub().last('DELETE /follow-ups/:followUpId/attachments/:attachmentId')
        .params,
    ).toEqual({ followUpId: FOLLOW_UP_ID, attachmentId: ATTACHMENT_ID });
  });

  it('baixa o conteúdo com o nome que a API manda', async () => {
    await signIn();
    apiStub().use({
      [CONTENT]: () =>
        apiFile('PNG', { fileName: 'curativo.png', type: 'image/png' }),
    });

    const { data } = await downloadAttachment(FOLLOW_UP_ID, ATTACHMENT_ID);

    expect(data.fileName).toBe('curativo.png');
    expect(await data.blob.text()).toBe('PNG');
    expect(apiStub().last(CONTENT)).toMatchObject({
      params: { followUpId: FOLLOW_UP_ID, attachmentId: ATTACHMENT_ID },
      token: TOKEN,
    });
  });

  it('devolve o erro da API com o código, como o arquivo de tipo não aceito', async () => {
    await signIn();
    apiStub().use({
      'POST /follow-ups/:followUpId/attachments': () =>
        apiFailure(
          415,
          'ATTACHMENT_UNSUPPORTED_TYPE',
          'Envie uma imagem JPEG, PNG ou WEBP, ou um PDF.',
        ),
    });

    await expect(
      uploadAttachment(FOLLOW_UP_ID, new File(['x'], 'nota.txt')),
    ).rejects.toMatchObject({
      status: 415,
      code: 'ATTACHMENT_UNSUPPORTED_TYPE',
    });
  });

  it('escapa os ids na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await downloadAttachment(FOLLOW_UP_ID, '../../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe(
      `/follow-ups/${FOLLOW_UP_ID}/attachments/..%2F..%2Fusers/content`,
    );
  });
});

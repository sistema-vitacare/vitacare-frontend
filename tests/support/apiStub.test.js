import { beforeEach, describe, expect, it } from 'vitest';
import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiUpload,
  configureApiSession,
} from '../../src/services/apiClient.js';
import { apiFailure, apiFile, apiPage, reply, stubApi } from './apiStub.js';

let api;

beforeEach(() => {
  configureApiSession({ getToken: () => 'token-de-teste' });
  api = stubApi({
    'GET /patients/:patientId': ({ params, query }) => ({
      data: { id: params.patientId, status: query.status },
      meta: {},
    }),
  });
});

describe('stub da API dos testes', () => {
  it('responde pela rota, com os parâmetros do caminho e a query', async () => {
    const response = await apiGet('/patients/p1', { status: 'active' });

    expect(response.data).toEqual({ id: 'p1', status: 'active' });
  });

  it('guarda cada requisição, com o corpo e o token, para o teste conferir', async () => {
    api.use({ 'POST /users': () => ({ data: { id: 'u1' }, meta: {} }) });

    await apiPost('/users', { name: 'Ana' });

    expect(api.last('POST /users')).toMatchObject({
      path: '/users',
      body: { name: 'Ana' },
      token: 'token-de-teste',
    });
    expect(api.requests.map((request) => request.key)).toEqual(['POST /users']);
  });

  it('responde com outro status pelo reply', async () => {
    api.use({
      'POST /auth/password-recovery/request': () =>
        reply(202, { data: null, meta: { message: 'Orientação.' } }),
      'DELETE /follow-ups/:followUpId/attachments/:attachmentId': () =>
        reply(204, null),
    });

    expect(
      (await apiPost('/auth/password-recovery/request', {})).meta.message,
    ).toBe('Orientação.');
    expect(await apiDelete('/follow-ups/f1/attachments/a1')).toEqual({
      data: null,
      meta: {},
    });
  });

  it('responde o erro da API pelo apiFailure', async () => {
    api.use({
      'POST /users': () =>
        apiFailure(409, 'USER_EMAIL_TAKEN', 'E-mail já usado.', [
          { field: 'email', code: 'TAKEN' },
        ]),
    });

    const error = await apiPost('/users', {}).catch((caught) => caught);

    expect(error).toMatchObject({
      status: 409,
      code: 'USER_EMAIL_TAKEN',
      message: 'E-mail já usado.',
      fields: [{ field: 'email', code: 'TAKEN' }],
    });
  });

  it('faz falhar só a rota pedida, uma vez', async () => {
    api.use({ 'GET /alerts': () => ({ data: [], meta: {} }) });
    api.fail('GET /patients/:patientId');

    expect(await apiGet('/alerts')).toEqual({ data: [], meta: {} });
    const error = await apiGet('/patients/p1').catch((caught) => caught);
    expect(error.status).toBe(500);
    expect((await apiGet('/patients/p1')).data.id).toBe('p1');
  });

  it('acusa a rota sem resposta no teste com um erro que a tela mostra', async () => {
    const error = await apiGet('/forms').catch((caught) => caught);

    expect(error).toMatchObject({ status: 501, code: 'TEST_UNHANDLED_ROUTE' });
    expect(error.message).toContain('GET /forms');
  });

  it('recebe o arquivo enviado em multipart', async () => {
    api.use({
      'POST /follow-ups/:followUpId/attachments': () =>
        reply(201, { data: { id: 'a1' }, meta: {} }),
    });

    await apiUpload(
      '/follow-ups/f1/attachments',
      new File(['x'], 'foto.png', { type: 'image/png' }),
    );

    expect(api.last('POST /follow-ups/:followUpId/attachments').body).toEqual(
      expect.any(FormData),
    );
  });

  it('responde um arquivo com o nome no Content-Disposition, como os PDFs e o CSV da API', async () => {
    api.use({
      'GET /audit-events/export': () =>
        apiFile('Data/hora;Ação\n', {
          fileName: 'auditoria-2026-10-01-a-2026-10-31.csv',
          type: 'text/csv; charset=utf-8',
        }),
    });

    const { data } = await apiDownload('/audit-events/export');

    expect(data.fileName).toBe('auditoria-2026-10-01-a-2026-10-31.csv');
    expect(data.blob.type).toMatch(/^text\/csv/);
    expect(await data.blob.text()).toBe('Data/hora;Ação\n');
  });

  it('responde pela rota literal antes da rota com parâmetro, como a API', async () => {
    api.use({
      'GET /patients/export': () => ({ data: 'literal', meta: {} }),
    });

    const literal = await apiGet('/patients/export');
    const withParam = await apiGet('/patients/p2');

    expect(literal.data).toBe('literal');
    expect(withParam.data.id).toBe('p2');
  });

  it('monta a página no formato da listagem da API', () => {
    expect(apiPage(['a', 'b'], { page: 2, limit: 2, total: 5 })).toEqual({
      data: ['a', 'b'],
      meta: expect.objectContaining({
        pagination: { page: 2, limit: 2, total: 5, totalPages: 3 },
      }),
    });
  });
});

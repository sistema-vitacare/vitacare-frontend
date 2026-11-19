import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorMessages } from '../../src/data/apiErrors.js';
import {
  ApiError,
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiPut,
  apiUpload,
  configureApiSession,
} from '../../src/services/apiClient.js';

const ORIGIN = 'https://api.exemplo.test';

function jsonResponse(status, body, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

let fetchMock;
let session;

beforeEach(() => {
  window.__VITACARE_CONFIG__ = { apiUrl: ORIGIN };
  fetchMock = vi.fn(async () =>
    jsonResponse(200, { data: { ok: true }, meta: { requestId: 'r1' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  session = {
    token: null,
    onUnauthorized: vi.fn(),
    onTermsRequired: vi.fn(),
  };
  configureApiSession({
    getToken: () => session.token,
    onUnauthorized: session.onUnauthorized,
    onTermsRequired: session.onTermsRequired,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.__VITACARE_CONFIG__;
});

const lastCall = () => fetchMock.mock.calls.at(-1);

describe('cliente HTTP da API', () => {
  it('chama a rota sob /api/v1 da origem configurada, com a query sem valores vazios', async () => {
    await apiGet('/patients', {
      search: 'dirce',
      status: '',
      condition: null,
      page: 2,
      limit: undefined,
    });

    const [url, init] = lastCall();
    expect(url).toBe(`${ORIGIN}/api/v1/patients?search=dirce&page=2`);
    expect(init.method).toBe('GET');
  });

  it('devolve o corpo de sucesso como { data, meta }, inclusive em 201 e 202', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(201, { data: null, meta: { requestId: 'a' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(202, {
          data: null,
          meta: { requestId: 'b', message: 'Orientação da API.' },
        }),
      );

    expect(await apiPost('/auth/password-recovery/reset', {})).toEqual({
      data: null,
      meta: { requestId: 'a' },
    });
    expect(await apiPost('/auth/password-recovery/request', {})).toEqual({
      data: null,
      meta: { requestId: 'b', message: 'Orientação da API.' },
    });
  });

  it('termina sem erro na resposta 204, que não tem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await apiDelete('/follow-ups/1/attachments/2')).toEqual({
      data: null,
      meta: {},
    });
  });

  it('envia o corpo em JSON e o token da sessão no Bearer', async () => {
    session.token = 'token-da-sessao';

    await apiPut('/auth/password', { currentPassword: 'a', newPassword: 'b' });

    const [, init] = lastCall();
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer token-da-sessao');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      currentPassword: 'a',
      newPassword: 'b',
    });
  });

  it('não envia o token nas rotas públicas', async () => {
    session.token = 'token-da-sessao';

    await apiPost('/auth/login', { email: 'x' }, { auth: false });

    expect(lastCall()[1].headers.Authorization).toBeUndefined();
  });

  it('transforma o corpo { error } da API num ApiError com os campos dele', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Alguns campos precisam ser corrigidos.',
          detail: '1 campo invalido na requisicao.',
          fields: [{ field: 'email', code: 'IS_EMAIL' }],
        },
        meta: { status: 422 },
      }),
    );

    const error = await apiPost('/users', {}).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Alguns campos precisam ser corrigidos.',
      detail: '1 campo invalido na requisicao.',
      fields: [{ field: 'email', code: 'IS_EMAIL' }],
    });
  });

  it('transforma resposta de erro sem JSON, como a de um proxy, num erro inesperado', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>Bad Gateway</html>', { status: 502 }),
    );

    const error = await apiGet('/patients').catch((caught) => caught);

    expect(error).toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: apiErrorMessages.unexpected,
    });
  });

  it('transforma a falha de rede num erro com nova tentativa possível', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = await apiGet('/patients').catch((caught) => caught);

    expect(error).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: apiErrorMessages.network,
    });
  });

  it('avisa a sessão do 401 de uma chamada que levava token', async () => {
    session.token = 'token-vencido';
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: {
          code: 'AUTH_UNAUTHENTICATED',
          message: 'Autenticação necessária.',
        },
      }),
    );

    const error = await apiGet('/patients').catch((caught) => caught);

    expect(error.status).toBe(401);
    expect(session.onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('não trata como sessão vencida o 401 do login, que vai sem token', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Credenciais inválidas.',
        },
      }),
    );

    const error = await apiPost('/auth/login', {}, { auth: false }).catch(
      (caught) => caught,
    );

    expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(session.onUnauthorized).not.toHaveBeenCalled();
  });

  it('usa o token próprio da chamada, como o do Sair, sem avisar a sessão do 401', async () => {
    session.token = 'token-da-sessao';
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: {
          code: 'AUTH_UNAUTHENTICATED',
          message: 'Autenticação necessária.',
        },
      }),
    );

    await apiPost('/auth/logout', undefined, { token: 'token-que-sai' }).catch(
      () => null,
    );

    expect(lastCall()[1].headers.Authorization).toBe('Bearer token-que-sai');
    expect(session.onUnauthorized).not.toHaveBeenCalled();
  });

  it('avisa a sessão do 403 de termo pendente, e não do 403 de permissão', async () => {
    session.token = 'token';
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(403, {
          error: { code: 'AUTH_FORBIDDEN', message: 'Sem permissão.' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(403, {
          error: {
            code: 'TERMS_ACCEPTANCE_REQUIRED',
            message: 'Aceite o termo de uso para continuar.',
          },
        }),
      );

    await apiGet('/users').catch(() => null);
    expect(session.onTermsRequired).not.toHaveBeenCalled();

    const error = await apiGet('/users').catch((caught) => caught);
    expect(error.code).toBe('TERMS_ACCEPTANCE_REQUIRED');
    expect(session.onTermsRequired).toHaveBeenCalledTimes(1);
  });

  it('baixa arquivo com o nome que a API manda em Content-Disposition', async () => {
    session.token = 'token';
    fetchMock.mockResolvedValueOnce(
      new Response('%PDF', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition':
            'attachment; filename="relatorio-paciente-2026-10-20-a-2026-11-19.pdf"',
        },
      }),
    );

    const { data } = await apiDownload('/patients/1/report/pdf', {
      from: '2026-10-20',
    });

    expect(lastCall()[0]).toBe(
      `${ORIGIN}/api/v1/patients/1/report/pdf?from=2026-10-20`,
    );
    expect(lastCall()[1].headers.Authorization).toBe('Bearer token');
    expect(data.fileName).toBe(
      'relatorio-paciente-2026-10-20-a-2026-11-19.pdf',
    );
    expect(await data.blob.text()).toBe('%PDF');
  });

  it('lê o nome codificado (filename*) quando a API o manda assim', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('a;b', {
        status: 200,
        headers: {
          'Content-Disposition':
            'attachment; filename="auditoria.csv"; filename*=UTF-8\'\'auditoria%20de%20novembro.csv',
        },
      }),
    );

    const { data } = await apiDownload('/audit-events/export');

    expect(data.fileName).toBe('auditoria de novembro.csv');
  });

  it('transforma o erro em JSON de um download num ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        error: { code: 'REPORT_EXPORT_FAILED', message: 'Falha ao gerar.' },
      }),
    );

    const error = await apiDownload('/patients/1/report/pdf').catch(
      (caught) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('REPORT_EXPORT_FAILED');
  });

  it('envia arquivo em multipart, na parte file, sem fixar o Content-Type', async () => {
    session.token = 'token';
    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' });

    await apiUpload('/follow-ups/1/attachments', file);

    const [url, init] = lastCall();
    expect(url).toBe(`${ORIGIN}/api/v1/follow-ups/1/attachments`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file').name).toBe('foto.png');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer token');
  });
});

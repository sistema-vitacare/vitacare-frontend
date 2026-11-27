import { afterEach, describe, expect, it, vi } from 'vitest';
import { permissionsFor } from '../../src/constants/permissions.js';
import { apiGet } from '../../src/services/apiClient.js';
import {
  AUTH_ERRORS,
  SESSION_STATES,
  changePassword,
  completeFirstAccess,
  currentViewer,
  endSession,
  login,
  refreshSession,
  requestPasswordRecovery,
  resetPassword,
  restoreSession,
  subscribeSession,
} from '../../src/services/authService.js';
import { apiFailure, apiStub, reply } from '../support/apiStub.js';
import {
  credentialsFor,
  demoUser,
  invitedUser,
  sessionHandlers,
} from '../support/fixtures/sessions.js';

const admin = credentialsFor('admin');
const invited = { ...admin, email: invitedUser.email };

afterEach(() => {
  vi.useRealTimers();
});

describe('authService', () => {
  it('entra pela API sem token, com código e e-mail normalizados', async () => {
    await login({
      organizationCode: ` ${admin.organizationCode.toUpperCase()} `,
      email: admin.email.toUpperCase(),
      password: admin.password,
    });

    const request = apiStub().last('POST /auth/login');
    expect(request.token).toBeNull();
    expect(request.body).toEqual(admin);
  });

  it('guarda a sessão do login no formato que as telas leem', async () => {
    const { data } = await login(admin);

    const user = demoUser('admin');
    expect(data).toBe(currentViewer());
    expect(data).toMatchObject({
      state: SESSION_STATES.AUTHENTICATED,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: { code: 'admin' },
      },
      organization: {
        code: admin.organizationCode,
        tradeName: 'Residencial Ipê Amarelo',
        kind: 'tenant',
      },
      permissions: permissionsFor('admin'),
      terms: { required: false },
    });
  });

  it('manda o token da sessão nas chamadas seguintes', async () => {
    await login(admin);
    apiStub().use({ 'GET /patients': () => ({ data: [], meta: {} }) });

    await apiGet('/patients');

    expect(apiStub().last('GET /patients').token).toBe(
      `token-${demoUser('admin').id}`,
    );
  });

  it('guarda a sessão restrita do convidado, sem permissões', async () => {
    const { data } = await login(invited);

    expect(data.state).toBe(SESSION_STATES.PASSWORD_CHANGE_REQUIRED);
    expect(data.permissions).toEqual([]);
  });

  it('guarda a sessão com o termo pendente, sem permissões', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));

    const { data } = await login(admin);

    expect(data.state).toBe(SESSION_STATES.TERMS_ACCEPTANCE_REQUIRED);
    expect(data.permissions).toEqual([]);
    expect(data.terms).toEqual({
      required: true,
      currentVersion: 2,
      acceptedVersion: 1,
    });
  });

  it('entrega o erro do login e fica sem sessão', async () => {
    const error = await login({ ...admin, password: 'senha-errada' }).catch(
      (caught) => caught,
    );

    expect(error.code).toBe(AUTH_ERRORS.INVALID_CREDENTIALS);
    expect(currentViewer()).toBeNull();
  });

  it('recupera a sessão guardada na aba depois de recarregar a página', async () => {
    await login(admin);
    vi.resetModules();

    const reloaded = await import('../../src/services/authService.js');

    expect(reloaded.restoreSession()).toMatchObject({
      user: { id: demoUser('admin').id },
      state: SESSION_STATES.AUTHENTICATED,
    });
  });

  it('descarta a sessão guardada que já passou do prazo', async () => {
    await login(admin);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 12 * 60 * 60 * 1000);
    vi.resetModules();

    const reloaded = await import('../../src/services/authService.js');

    expect(reloaded.restoreSession()).toBeNull();
    expect(reloaded.currentViewer()).toBeNull();
  });

  it('encerra a sessão e avisa quem ouve quando a API responde 401 a uma chamada', async () => {
    await login(admin);
    const listener = vi.fn();
    subscribeSession(listener);
    apiStub().use({
      'GET /patients': () =>
        apiFailure(401, 'AUTH_UNAUTHENTICATED', 'Autenticação necessária.'),
    });

    await apiGet('/patients').catch(() => null);

    expect(currentViewer()).toBeNull();
    expect(restoreSession()).toBeNull();
    expect(listener).toHaveBeenCalledWith({ type: 'expired' });
  });

  it('passa a sessão ao termo pendente quando a API pede o aceite', async () => {
    await login(admin);
    const listener = vi.fn();
    subscribeSession(listener);
    apiStub().use({
      'GET /patients': () =>
        apiFailure(
          403,
          'TERMS_ACCEPTANCE_REQUIRED',
          'Aceite o termo de uso para continuar.',
        ),
    });

    await apiGet('/patients').catch(() => null);

    expect(currentViewer()).toMatchObject({
      state: SESSION_STATES.TERMS_ACCEPTANCE_REQUIRED,
      permissions: [],
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'terms',
      session: currentViewer(),
    });
  });

  it('para de avisar quem cancelou a inscrição', async () => {
    await login(admin);
    const listener = vi.fn();
    const unsubscribe = subscribeSession(listener);
    unsubscribe();
    apiStub().use({
      'GET /patients': () =>
        apiFailure(401, 'AUTH_UNAUTHENTICATED', 'Autenticação necessária.'),
    });

    await apiGet('/patients').catch(() => null);

    expect(listener).not.toHaveBeenCalled();
  });

  it('recarrega a sessão pelo GET /profile, com as permissões', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));
    await login(admin);

    const session = await refreshSession();

    expect(session).toBe(currentViewer());
    expect(session.state).toBe(SESSION_STATES.AUTHENTICATED);
    expect(session.permissions).toEqual(permissionsFor('admin'));
    expect(apiStub().last('GET /profile').token).toBe(
      `token-${demoUser('admin').id}`,
    );
  });

  it('sai pela API com o token da sessão e encerra a sessão antes da resposta', async () => {
    await login(admin);
    const listener = vi.fn();
    subscribeSession(listener);

    await endSession();

    expect(apiStub().last('POST /auth/logout').token).toBe(
      `token-${demoUser('admin').id}`,
    );
    expect(currentViewer()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it('sai mesmo quando o logout falha na API', async () => {
    await login(admin);
    apiStub().use({
      'POST /auth/logout': () =>
        apiFailure(401, 'AUTH_UNAUTHENTICATED', 'Autenticação necessária.'),
    });

    await endSession();

    expect(currentViewer()).toBeNull();
  });

  it('conclui o primeiro acesso com o token da sessão restrita e encerra a sessão', async () => {
    await login(invited);
    apiStub().use({
      'POST /auth/password/first-access': () => ({ data: null, meta: {} }),
    });

    await completeFirstAccess({ newPassword: 'senha-definitiva' });

    expect(apiStub().last('POST /auth/password/first-access')).toMatchObject({
      token: `token-${invitedUser.id}`,
      body: { newPassword: 'senha-definitiva' },
    });
    expect(currentViewer()).toBeNull();
  });

  it('troca a própria senha e encerra a sessão, como a API', async () => {
    await login(admin);
    apiStub().use({ 'PUT /auth/password': () => ({ data: null, meta: {} }) });

    await changePassword({ currentPassword: 'a', newPassword: 'b' });

    expect(apiStub().last('PUT /auth/password').body).toEqual({
      currentPassword: 'a',
      newPassword: 'b',
    });
    expect(currentViewer()).toBeNull();
  });

  it('mantém a sessão quando a senha atual não confere', async () => {
    await login(admin);
    apiStub().use({
      'PUT /auth/password': () =>
        apiFailure(
          422,
          AUTH_ERRORS.CURRENT_PASSWORD_INVALID,
          'Senha atual inválida.',
        ),
    });

    const error = await changePassword({
      currentPassword: 'x',
      newPassword: 'y',
    }).catch((caught) => caught);

    expect(error.code).toBe(AUTH_ERRORS.CURRENT_PASSWORD_INVALID);
    expect(currentViewer()).not.toBeNull();
  });

  it('pede a recuperação sem token e devolve a orientação da API', async () => {
    apiStub().use({
      'POST /auth/password-recovery/request': () =>
        reply(202, { data: null, meta: { message: 'Orientação da API.' } }),
    });

    const { meta } = await requestPasswordRecovery({
      organizationCode: ' Ipe-Amarelo ',
      email: 'Ana@Exemplo.test',
    });

    expect(meta.message).toBe('Orientação da API.');
    expect(
      apiStub().last('POST /auth/password-recovery/request'),
    ).toMatchObject({
      token: null,
      body: { organizationCode: 'ipe-amarelo', email: 'ana@exemplo.test' },
    });
  });

  it('redefine a senha pelo token do link, sem token de sessão', async () => {
    apiStub().use({
      'POST /auth/password-recovery/reset': () =>
        reply(201, { data: null, meta: {} }),
    });

    await resetPassword({ token: 'token-do-link', newPassword: 'nova-senha' });

    expect(apiStub().last('POST /auth/password-recovery/reset')).toMatchObject({
      token: null,
      body: { token: 'token-do-link', newPassword: 'nova-senha' },
    });
  });
});

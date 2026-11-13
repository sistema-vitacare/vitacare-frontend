// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { permissionsFor } from '../../src/constants/permissions.js';
import {
  DEMO_PASSWORD,
  DEMO_RESET_LINK,
  RECOVERY_GUIDANCE,
} from '../../src/data/mocks/credentials.js';
import {
  AUTH_ERRORS,
  DEMO_PROFILES,
  SESSION_STATES,
  changePassword,
  completeFirstAccess,
  currentViewer,
  endSession,
  login,
  requestPasswordRecovery,
  resetPassword,
  startDemoSession,
} from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { changeUser, findUser } from '../../src/services/userStore.js';

const MINUTE = 60 * 1000;
const NOW = new Date('2026-11-10T12:00:00.000Z');

const helena = {
  organizationCode: 'ipe-amarelo',
  email: 'helena.vasconcelos@ipeamarelo.example',
  password: DEMO_PASSWORD,
};
// Convidada (status `pending`) dos dados simulados.
const edna = { ...helena, email: 'edna.pires@ipeamarelo.example' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('authService', () => {
  it('oferece um usuário de demonstração para cada um dos cinco perfis', async () => {
    expect(DEMO_PROFILES).toHaveLength(5);

    for (const profile of DEMO_PROFILES) {
      const { data } = await startDemoSession(profile);
      expect(data.user.profile.code).toBe(profile);
    }
  });

  it('inicia a sessão do cuidador com usuário, organização e permissões do perfil', async () => {
    const { data } = await startDemoSession('caregiver');

    expect(data.state).toBe('authenticated');
    expect(data.user.profile.code).toBe('caregiver');
    expect(data.organization.code).toBe('ipe-amarelo');
    expect(data.permissions).toEqual(permissionsFor('caregiver'));
  });

  it('inicia a sessão do administrador da plataforma na organização de plataforma', async () => {
    const { data } = await startDemoSession('platform_admin');

    expect(data.organization.kind).toBe('platform');
    expect(data.permissions).toContain('platform_organizations:read');
  });

  it('define o fim da sessão 12 horas depois do início, como a API', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T12:00:00.000Z'));

    const { data } = await startDemoSession('admin');

    expect(data.expiresAt).toBe('2026-11-10T00:00:00.000Z');
  });

  it('recusa perfil sem usuário de demonstração', async () => {
    await expect(startDemoSession('visitante')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('encerra a sessão sem erro', async () => {
    await expect(endSession()).resolves.toEqual(
      expect.objectContaining({ data: null }),
    );
  });
});

describe('login', () => {
  it('abre sessão normal de 12 horas com usuário, organização e permissões do perfil', async () => {
    const { data } = await login(helena);

    expect(data.state).toBe(SESSION_STATES.AUTHENTICATED);
    expect(data.expiresAt).toBe('2026-11-11T00:00:00.000Z');
    expect(data.user.name).toBe('Helena Vasconcelos');
    expect(data.organization.code).toBe('ipe-amarelo');
    expect(data.permissions).toEqual(permissionsFor('admin'));
  });

  it('aceita código e e-mail com maiúsculas e espaços nas pontas, como a API', async () => {
    const { data } = await login({
      ...helena,
      organizationCode: ' IPE-AMARELO ',
      email: 'Helena.Vasconcelos@IpeAmarelo.example ',
    });

    expect(data.state).toBe(SESSION_STATES.AUTHENTICATED);
  });

  it('abre a sessão do administrador da plataforma pela organização vitacare', async () => {
    const { data } = await login({
      organizationCode: 'vitacare',
      email: 'caio.furtado@vitacare.example',
      password: DEMO_PASSWORD,
    });

    expect(data.organization.kind).toBe('platform');
    expect(data.permissions).toEqual(permissionsFor('platform_admin'));
  });

  it.each([
    ['senha errada', { ...helena, password: 'senha-errada' }],
    ['e-mail sem conta', { ...helena, email: 'ninguem@ipeamarelo.example' }],
    ['organização inexistente', { ...helena, organizationCode: 'outra-org' }],
    [
      'usuária inativa',
      { ...helena, email: 'patricia.duarte@ipeamarelo.example' },
    ],
    ['conta de outra organização', { ...helena, organizationCode: 'vitacare' }],
  ])('responde o mesmo 401 para %s', async (_, credentials) => {
    await expect(login(credentials)).rejects.toMatchObject({
      status: 401,
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
    });
  });

  it('abre sessão restrita de 10 minutos, sem permissões, para a convidada', async () => {
    const { data } = await login(edna);

    expect(data.state).toBe(SESSION_STATES.PASSWORD_CHANGE_REQUIRED);
    expect(data.expiresAt).toBe('2026-11-10T12:10:00.000Z');
    expect(data.user.name).toBe('Edna Carvalho Pires');
    expect(data.permissions).toEqual([]);
  });

  it('responde 422 com os campos quando o formato é inválido', async () => {
    await expect(
      login({ organizationCode: 'a', email: 'helena', password: '123' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [
        expect.objectContaining({ field: 'organizationCode' }),
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
      ],
    });
  });
});

describe('bloqueio do login', () => {
  const wrong = { ...helena, password: 'senha-errada' };

  async function failTimes(count) {
    for (let attempt = 0; attempt < count; attempt += 1) {
      await expect(login(wrong)).rejects.toMatchObject({ status: 401 });
    }
  }

  it('bloqueia a sexta tentativa depois de cinco falhas, mesmo com a senha certa', async () => {
    await failTimes(5);

    await expect(login(helena)).rejects.toMatchObject({
      status: 429,
      code: AUTH_ERRORS.TEMPORARILY_BLOCKED,
    });
  });

  it('libera a conta 15 minutos depois da última falha', async () => {
    await failTimes(5);

    vi.setSystemTime(new Date(NOW.getTime() + 15 * MINUTE));

    await expect(login(helena)).resolves.toMatchObject({
      data: { state: SESSION_STATES.AUTHENTICATED },
    });
  });

  it('zera a contagem quando a senha certa entra antes do limite', async () => {
    await failTimes(4);
    await login(helena);

    await failTimes(4);

    await expect(login(helena)).resolves.toBeDefined();
  });

  it('não bloqueia outra conta da mesma organização', async () => {
    await failTimes(5);

    await expect(
      login({ ...helena, email: 'rafael.brandao@ipeamarelo.example' }),
    ).resolves.toBeDefined();
  });
});

describe('primeiro acesso', () => {
  async function restrictedSession() {
    const { data } = await login(edna);
    return data;
  }

  it('recusa a nova senha igual à provisória', async () => {
    const session = await restrictedSession();

    await expect(
      completeFirstAccess(session, { newPassword: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ status: 422, code: AUTH_ERRORS.PASSWORD_REUSE });
  });

  it('troca a senha: a nova abre sessão normal e a provisória deixa de entrar', async () => {
    const session = await restrictedSession();

    const response = await completeFirstAccess(session, {
      newPassword: 'senha-definitiva',
    });

    expect(response.data).toBeNull();
    await expect(
      login({ ...edna, password: 'senha-definitiva' }),
    ).resolves.toMatchObject({
      data: { state: SESSION_STATES.AUTHENTICATED },
    });
    await expect(login(edna)).rejects.toMatchObject({ status: 401 });
  });

  it('recusa a sessão restrita vencida', async () => {
    const session = await restrictedSession();
    vi.setSystemTime(new Date(NOW.getTime() + 10 * MINUTE));

    await expect(
      completeFirstAccess(session, { newPassword: 'senha-definitiva' }),
    ).rejects.toMatchObject({ status: 401, code: AUTH_ERRORS.UNAUTHENTICATED });
  });

  it('recusa a sessão normal', async () => {
    const { data } = await login(helena);

    await expect(
      completeFirstAccess(data, { newPassword: 'senha-definitiva' }),
    ).rejects.toMatchObject({ status: 401, code: AUTH_ERRORS.UNAUTHENTICATED });
  });

  it('recusa a nova senha com menos de 8 caracteres', async () => {
    const session = await restrictedSession();

    await expect(
      completeFirstAccess(session, { newPassword: '1234567' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
  });
});

describe('pedido de recuperação de senha', () => {
  it('dá a mesma resposta para e-mail com conta e sem conta', async () => {
    const withAccount = await requestPasswordRecovery({
      organizationCode: helena.organizationCode,
      email: helena.email,
    });
    const withoutAccount = await requestPasswordRecovery({
      organizationCode: helena.organizationCode,
      email: 'ninguem@ipeamarelo.example',
    });

    expect(withAccount.data).toBeNull();
    expect(withAccount.meta.message).toBe(RECOVERY_GUIDANCE);
    expect(withoutAccount.data).toBeNull();
    expect(withoutAccount.meta.message).toBe(RECOVERY_GUIDANCE);
  });

  it('bloqueia o quarto pedido da mesma conta dentro de uma hora', async () => {
    const request = { organizationCode: 'ipe-amarelo', email: helena.email };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await requestPasswordRecovery(request);
    }

    await expect(requestPasswordRecovery(request)).rejects.toMatchObject({
      status: 429,
      code: AUTH_ERRORS.TEMPORARILY_BLOCKED,
    });
  });
});

describe('redefinição pelo link', () => {
  const rafael = {
    organizationCode: DEMO_RESET_LINK.organizationCode,
    email: DEMO_RESET_LINK.email,
  };

  it('redefine a senha da conta do link, que passa a entrar com a nova', async () => {
    const response = await resetPassword({
      token: DEMO_RESET_LINK.token,
      newPassword: 'senha-recuperada',
    });

    expect(response.data).toBeNull();
    await expect(
      login({ ...rafael, password: 'senha-recuperada' }),
    ).resolves.toBeDefined();
    await expect(
      login({ ...rafael, password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('recusa o link já usado, como a API', async () => {
    await resetPassword({
      token: DEMO_RESET_LINK.token,
      newPassword: 'senha-recuperada',
    });

    await expect(
      resetPassword({
        token: DEMO_RESET_LINK.token,
        newPassword: 'outra-1234',
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: AUTH_ERRORS.RESET_TOKEN_INVALID,
    });
  });

  it('recusa o link desconhecido', async () => {
    await expect(
      resetPassword({ token: 'qualquer-coisa', newPassword: 'senha-nova-1' }),
    ).rejects.toMatchObject({
      status: 422,
      code: AUTH_ERRORS.RESET_TOKEN_INVALID,
    });
  });

  it('recusa a nova senha com menos de 8 caracteres', async () => {
    await expect(
      resetPassword({ token: DEMO_RESET_LINK.token, newPassword: '123' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
  });
});

describe('estado simulado', () => {
  it('volta ao início com resetMockState: sem bloqueio e com a senha de demonstração', async () => {
    const session = (await login(edna)).data;
    await completeFirstAccess(session, { newPassword: 'senha-definitiva' });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login({ ...helena, password: 'senha-errada' }).catch(() => {});
    }

    resetMockState();

    await expect(login(helena)).resolves.toBeDefined();
    await expect(login(edna)).resolves.toMatchObject({
      data: { state: SESSION_STATES.PASSWORD_CHANGE_REQUIRED },
    });
  });
});

describe('usuários do estado', () => {
  it('recusa o login de quem foi inativado na sessão', async () => {
    changeUser('f43fdabb-62fc-569d-aa6b-02800cd5b1cd', { status: 'inactive' });

    await expect(login(helena)).rejects.toMatchObject({
      status: 401,
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
    });
  });

  it('ativa a convidada no estado dos usuários ao concluir o primeiro acesso', async () => {
    const { data: session } = await login(edna);

    await completeFirstAccess(session, { newPassword: 'senha-nova-da-edna' });

    expect(findUser('8ffa0d80-db2f-52a7-a275-08f89cce49c1')).toMatchObject({
      status: 'active',
      invitation: null,
    });
  });
});

describe('troca da própria senha', () => {
  const body = { currentPassword: DEMO_PASSWORD, newPassword: 'senha-nova-1' };

  it('exige sessão normal', async () => {
    await expect(changePassword(body)).rejects.toMatchObject({ status: 401 });
  });

  it('troca a senha e encerra a sessão; o login passa a pedir a nova', async () => {
    await login(helena);

    await changePassword(body);

    expect(currentViewer()).toBeNull();
    await expect(login(helena)).rejects.toMatchObject({ status: 401 });
    await expect(
      login({ ...helena, password: 'senha-nova-1' }),
    ).resolves.toBeDefined();
  });

  it('recusa a senha atual errada e a nova igual à atual', async () => {
    await login(helena);

    await expect(
      changePassword({ ...body, currentPassword: 'outra-senha' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'AUTH_CURRENT_PASSWORD_INVALID',
    });
    await expect(
      changePassword({ ...body, newPassword: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ status: 422, code: AUTH_ERRORS.PASSWORD_REUSE });
  });

  it('recusa a senha nova fora de 8 a 128 caracteres, com o campo', async () => {
    await login(helena);

    await expect(
      changePassword({ ...body, newPassword: 'curta' }),
    ).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'newPassword', code: 'tooShort' }],
    });
    expect(currentViewer()).not.toBeNull();
  });
});

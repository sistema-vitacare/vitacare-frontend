import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { useSession } from '../../src/hooks/useSession.js';
import { apiGet } from '../../src/services/apiClient.js';
import { apiFailure, apiStub } from '../support/apiStub.js';
import {
  credentialsFor,
  invitedUser,
  sessionHandlers,
} from '../support/fixtures/sessions.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const helena = credentialsFor('admin');
// Convidada (status `pending`) dos dados de demonstração.
const edna = { ...helena, email: invitedUser.email };

function renderSession() {
  return renderHook(() => useSession(), { wrapper: SessionProvider });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SessionProvider', () => {
  it('começa sem sessão, no estado anonymous e sem permissões', () => {
    const { result } = renderSession();

    expect(result.current.status).toBe('anonymous');
    expect(result.current.session).toBeNull();
    expect(result.current.can('patients:read')).toBe(false);
  });

  it('entra pelo formulário e passa a ter as permissões que a API devolve', async () => {
    const { result } = renderSession();

    await act(() => result.current.signInWithPassword(helena));

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session.user.profile.code).toBe('admin');
    expect(result.current.can('dashboard:read')).toBe(true);
  });

  it('entrega o erro do login a quem chamou e continua sem sessão', async () => {
    const { result } = renderSession();

    await act(() =>
      expect(
        result.current.signInWithPassword({ ...helena, password: 'errada-1' }),
      ).rejects.toMatchObject({ status: 401 }),
    );

    expect(result.current.status).toBe('anonymous');
  });

  it('deixa a convidada na sessão restrita, sem nenhuma permissão', async () => {
    const { result } = renderSession();

    await act(() => result.current.signInWithPassword(edna));

    expect(result.current.status).toBe('restricted');
    expect(result.current.session.user.name).toBe('Edna Carvalho Pires');
    expect(result.current.can('patients:read')).toBe(false);
  });

  it('deixa quem não aceitou o termo vigente no estado terms, sem permissões', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));
    const { result } = renderSession();

    await act(() => result.current.signInWithPassword(helena));

    expect(result.current.status).toBe('terms');
    expect(result.current.can('dashboard:read')).toBe(false);
  });

  it('libera a mesma sessão depois do aceite, recarregando-a pelo GET /profile', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    await act(() => result.current.reloadSession());

    expect(result.current.status).toBe('authenticated');
    expect(result.current.can('dashboard:read')).toBe(true);
  });

  it('volta com a sessão guardada na aba quando a página recarrega', async () => {
    const first = renderSession();
    await act(() => first.result.current.signInWithPassword(helena));
    first.unmount();

    const { result } = renderSession();

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session.user.email).toBe(helena.email);
  });

  it('passa a expired quando a API encerra a sessão numa chamada qualquer', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));
    apiStub().use({
      'GET /patients': () =>
        apiFailure(401, 'AUTH_UNAUTHENTICATED', 'Autenticação necessária.'),
    });

    await act(() => apiGet('/patients').catch(() => null));

    expect(result.current.status).toBe('expired');
    expect(result.current.session).toBeNull();
  });

  it('passa ao termo quando a API pede o aceite numa chamada qualquer', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));
    apiStub().use({
      'GET /patients': () =>
        apiFailure(
          403,
          'TERMS_ACCEPTANCE_REQUIRED',
          'Aceite o termo de uso para continuar.',
        ),
    });

    await act(() => apiGet('/patients').catch(() => null));

    expect(result.current.status).toBe('terms');
    expect(result.current.can('dashboard:read')).toBe(false);
  });

  it('continua autenticada até o último minuto das 12 horas', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    act(() => vi.advanceTimersByTime(12 * HOUR - 60 * 1000));

    expect(result.current.status).toBe('authenticated');
  });

  it('expira depois de 12 horas e perde usuário e permissões', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    act(() => vi.advanceTimersByTime(12 * HOUR));

    expect(result.current.status).toBe('expired');
    expect(result.current.session).toBeNull();
    expect(result.current.can('dashboard:read')).toBe(false);
  });

  it('expira a sessão restrita em 10 minutos', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    act(() => vi.advanceTimersByTime(10 * MINUTE - 1000));
    expect(result.current.status).toBe('restricted');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe('expired');
  });

  it('conclui o primeiro acesso, encerra a sessão restrita e guarda organização e e-mail para o login', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () => ({ data: null, meta: {} }),
    });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    await act(() => result.current.completeFirstAccess('senha-definitiva'));

    expect(apiStub().last('POST /auth/password/first-access').body).toEqual({
      newPassword: 'senha-definitiva',
    });
    expect(result.current.status).toBe('anonymous');
    expect(result.current.session).toBeNull();
    expect(result.current.notice).toEqual({
      kind: 'passwordChanged',
      organizationCode: 'ipe-amarelo',
      email: invitedUser.email,
    });
  });

  it('mantém a sessão restrita quando o primeiro acesso é recusado', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () =>
        apiFailure(
          422,
          'AUTH_PASSWORD_REUSE',
          'A nova senha não pode ser igual à atual.',
        ),
    });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    await act(() =>
      expect(
        result.current.completeFirstAccess('senha-provisoria'),
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_REUSE' }),
    );

    expect(result.current.status).toBe('restricted');
  });

  it('troca a própria senha, encerra a sessão e guarda organização e e-mail para o login', async () => {
    apiStub().use({ 'PUT /auth/password': () => ({ data: null, meta: {} }) });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    await act(() =>
      result.current.changePassword({
        currentPassword: helena.password,
        newPassword: 'senha-nova-da-helena',
      }),
    );

    expect(result.current.status).toBe('anonymous');
    expect(result.current.notice).toEqual({
      kind: 'passwordChanged',
      organizationCode: 'ipe-amarelo',
      email: helena.email,
    });
  });

  it('mantém a sessão quando a senha atual não confere', async () => {
    apiStub().use({
      'PUT /auth/password': () =>
        apiFailure(
          422,
          'AUTH_CURRENT_PASSWORD_INVALID',
          'Senha atual inválida.',
        ),
    });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    await act(() =>
      expect(
        result.current.changePassword({
          currentPassword: 'senha-errada',
          newPassword: 'senha-nova-da-helena',
        }),
      ).rejects.toMatchObject({ code: 'AUTH_CURRENT_PASSWORD_INVALID' }),
    );

    expect(result.current.status).toBe('authenticated');
  });

  it('limpa o aviso do primeiro acesso na próxima entrada', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () => ({ data: null, meta: {} }),
    });
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));
    await act(() => result.current.completeFirstAccess('senha-definitiva'));

    await act(() => result.current.signInWithPassword(helena));

    expect(result.current.status).toBe('authenticated');
    expect(result.current.notice).toBeNull();
  });

  it('sai pela API e volta ao estado anonymous', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    await act(() => result.current.signOut());

    expect(apiStub().last('POST /auth/logout')).toBeDefined();
    expect(result.current.status).toBe('anonymous');
    expect(result.current.can('dashboard:read')).toBe(false);
  });

  it('sai da sessão restrita pelo Sair', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    await act(() => result.current.signOut());

    expect(result.current.status).toBe('anonymous');
  });

  it('avisa quando useSession é usado fora do SessionProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
  });
});

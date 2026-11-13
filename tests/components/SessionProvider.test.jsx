import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { DEMO_PASSWORD } from '../../src/data/mocks/credentials.js';
import { useSession } from '../../src/hooks/useSession.js';
import { resetMockState } from '../../src/services/mockApi.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const helena = {
  organizationCode: 'ipe-amarelo',
  email: 'helena.vasconcelos@ipeamarelo.example',
  password: DEMO_PASSWORD,
};
// Convidada (status `pending`) dos dados simulados.
const edna = { ...helena, email: 'edna.pires@ipeamarelo.example' };

function renderSession() {
  return renderHook(() => useSession(), { wrapper: SessionProvider });
}

afterEach(() => {
  resetMockState();
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

  it('entra com o perfil escolhido e passa a ter as permissões dele', async () => {
    const { result } = renderSession();

    await act(() => result.current.signIn('professional'));

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session.user.profile.code).toBe('professional');
    expect(result.current.can('patients:create')).toBe(true);
    expect(result.current.can('users:read')).toBe(false);
  });

  it('sai e volta ao estado anonymous', async () => {
    const { result } = renderSession();
    await act(() => result.current.signIn('caregiver'));
    expect(result.current.status).toBe('authenticated');

    await act(() => result.current.signOut());

    expect(result.current.status).toBe('anonymous');
    expect(result.current.can('follow_ups:create')).toBe(false);
  });

  it('continua autenticada até o último minuto das 12 horas', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { result } = renderSession();
    await act(() => result.current.signIn('admin'));

    act(() => vi.advanceTimersByTime(12 * HOUR - 60 * 1000));

    expect(result.current.status).toBe('authenticated');
  });

  it('expira depois de 12 horas e perde usuário e permissões', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { result } = renderSession();
    await act(() => result.current.signIn('admin'));

    act(() => vi.advanceTimersByTime(12 * HOUR));

    expect(result.current.status).toBe('expired');
    expect(result.current.session).toBeNull();
    expect(result.current.can('dashboard:read')).toBe(false);
  });

  it('entra pelo formulário com código, e-mail e senha', async () => {
    const { result } = renderSession();

    await act(() => result.current.signInWithPassword(helena));

    expect(result.current.status).toBe('authenticated');
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
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    await act(() => result.current.completeFirstAccess('senha-definitiva'));

    expect(result.current.status).toBe('anonymous');
    expect(result.current.session).toBeNull();
    expect(result.current.notice).toEqual({
      kind: 'passwordChanged',
      organizationCode: 'ipe-amarelo',
      email: 'edna.pires@ipeamarelo.example',
    });
  });

  it('troca a própria senha, encerra a sessão e guarda organização e e-mail para o login', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(helena));

    await act(() =>
      result.current.changePassword({
        currentPassword: DEMO_PASSWORD,
        newPassword: 'senha-nova-da-helena',
      }),
    );

    expect(result.current.status).toBe('anonymous');
    expect(result.current.notice).toEqual({
      kind: 'passwordChanged',
      organizationCode: 'ipe-amarelo',
      email: 'helena.vasconcelos@ipeamarelo.example',
    });
    await act(() =>
      result.current.signInWithPassword({
        ...helena,
        password: 'senha-nova-da-helena',
      }),
    );
    expect(result.current.status).toBe('authenticated');
  });

  it('mantém a sessão quando a senha atual não confere', async () => {
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

  it('mantém a sessão restrita quando o primeiro acesso é recusado', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));

    await act(() =>
      expect(
        result.current.completeFirstAccess(DEMO_PASSWORD),
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_REUSE' }),
    );

    expect(result.current.status).toBe('restricted');
  });

  it('limpa o aviso do primeiro acesso na próxima entrada', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));
    await act(() => result.current.completeFirstAccess('senha-definitiva'));

    await act(() =>
      result.current.signInWithPassword({
        ...edna,
        password: 'senha-definitiva',
      }),
    );

    expect(result.current.status).toBe('authenticated');
    expect(result.current.notice).toBeNull();
  });

  it('sai da sessão restrita pelo Sair', async () => {
    const { result } = renderSession();
    await act(() => result.current.signInWithPassword(edna));
    expect(result.current.status).toBe('restricted');

    await act(() => result.current.signOut());

    expect(result.current.status).toBe('anonymous');
  });

  it('avisa quando useSession é usado fora do SessionProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
  });
});

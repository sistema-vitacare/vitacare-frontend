import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { useSession } from '../../src/hooks/useSession.js';

const HOUR = 60 * 60 * 1000;

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

  it('avisa quando useSession é usado fora do SessionProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
  });
});

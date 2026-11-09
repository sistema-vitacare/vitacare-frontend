import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionContext } from '../hooks/useSession.js';
import { endSession, startDemoSession } from '../services/authService.js';

const ANONYMOUS = { status: 'anonymous', session: null };
const EXPIRED = { status: 'expired', session: null };

export default function SessionProvider({ children }) {
  const [state, setState] = useState(ANONYMOUS);

  // Ao chegar o prazo absoluto, a sessão acaba mesmo sem interação, como na
  // API: depois disso, nenhuma tela pode continuar mostrando dados.
  useEffect(() => {
    if (!state.session) {
      return undefined;
    }
    const remaining = Date.parse(state.session.expiresAt) - Date.now();
    const timer = setTimeout(() => setState(EXPIRED), Math.max(remaining, 0));
    return () => clearTimeout(timer);
  }, [state.session]);

  const signIn = useCallback(async (profileCode) => {
    const response = await startDemoSession(profileCode);
    setState({ status: 'authenticated', session: response.data });
  }, []);

  const signOut = useCallback(async () => {
    await endSession();
    setState(ANONYMOUS);
  }, []);

  const value = useMemo(() => {
    const granted = new Set(state.session?.permissions ?? []);
    return {
      ...state,
      can: (permission) => granted.has(permission),
      signIn,
      signOut,
    };
  }, [state, signIn, signOut]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

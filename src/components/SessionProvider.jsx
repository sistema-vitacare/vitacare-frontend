import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionContext } from '../hooks/useSession.js';
import {
  AUTH_ERRORS,
  SESSION_STATES,
  changePassword as changePasswordRequest,
  completeFirstAccess as completeFirstAccessRequest,
  endSession,
  login,
  startDemoSession,
} from '../services/authService.js';

const ANONYMOUS = { status: 'anonymous', session: null, notice: null };
const EXPIRED = { status: 'expired', session: null, notice: null };

function stateFor(session) {
  const status =
    session.state === SESSION_STATES.PASSWORD_CHANGE_REQUIRED
      ? 'restricted'
      : 'authenticated';
  return { status, session, notice: null };
}

export default function SessionProvider({ children }) {
  const [state, setState] = useState(ANONYMOUS);

  // Ao chegar o prazo absoluto, a sessão acaba mesmo sem interação, como na
  // API: depois disso, nenhuma tela pode continuar mostrando dados. Vale para
  // a sessão normal (12 horas) e para a restrita (10 minutos).
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
    setState(stateFor(response.data));
  }, []);

  const signInWithPassword = useCallback(async (credentials) => {
    const response = await login(credentials);
    setState(stateFor(response.data));
  }, []);

  const { session } = state;

  // Troca de senha que a API conclui encerrando a sessão: a sessão vencida
  // vira `expired`; a troca feita volta ao login com o aviso, que leva a
  // organização e o e-mail, para não pedir de novo.
  const endWithNewPassword = useCallback(
    async (request) => {
      try {
        await request();
      } catch (error) {
        if (error.code === AUTH_ERRORS.UNAUTHENTICATED) {
          setState(EXPIRED);
        }
        throw error;
      }
      setState({
        ...ANONYMOUS,
        notice: {
          kind: 'passwordChanged',
          organizationCode: session.organization.code,
          email: session.user.email,
        },
      });
    },
    [session],
  );

  // A API encerra a sessão restrita e exige login com a senha nova.
  const completeFirstAccess = useCallback(
    (newPassword) =>
      endWithNewPassword(() =>
        completeFirstAccessRequest(session, { newPassword }),
      ),
    [endWithNewPassword, session],
  );

  // A troca da própria senha encerra todas as sessões da conta, inclusive
  // esta, como na API.
  const changePassword = useCallback(
    (passwords) => endWithNewPassword(() => changePasswordRequest(passwords)),
    [endWithNewPassword],
  );

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
      signInWithPassword,
      completeFirstAccess,
      changePassword,
      signOut,
    };
  }, [
    state,
    signIn,
    signInWithPassword,
    completeFirstAccess,
    changePassword,
    signOut,
  ]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

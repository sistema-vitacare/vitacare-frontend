import { createContext, useContext } from 'react';

export const SessionContext = createContext(null);

/**
 * Sessão atual: `status` (`anonymous`, `authenticated` ou `expired`),
 * `session` (usuário, organização, permissões e prazo), `can(permission)`,
 * `signIn(profileCode)` e `signOut()`.
 */
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    // Sem o provedor, todo `can()` daria falso em silêncio e as telas
    // pareceriam sem permissão; o erro aponta a causa na hora.
    throw new Error('useSession precisa ser usado dentro do SessionProvider.');
  }
  return value;
}

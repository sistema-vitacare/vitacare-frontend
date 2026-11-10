import { createContext, useContext } from 'react';

export const SessionContext = createContext(null);

/**
 * Sessão atual: `status` (`anonymous`, `restricted`, `authenticated` ou
 * `expired`), `session` (usuário, organização, permissões e prazo), `notice`
 * (aviso para o login depois do primeiro acesso), `can(permission)`,
 * `signIn(profileCode)` (atalho de demonstração),
 * `signInWithPassword(credentials)`, `completeFirstAccess(newPassword)` e
 * `signOut()`.
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

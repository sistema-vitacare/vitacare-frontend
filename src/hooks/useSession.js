import { createContext, useContext } from 'react';

export const SessionContext = createContext(null);

/**
 * Sessão atual: `status` (`anonymous`, `restricted`, `terms`,
 * `authenticated` ou `expired`), `session` (usuário, organização, permissões,
 * termo e prazo), `notice` (aviso para o login depois de uma troca de senha),
 * `can(permission)`, `signInWithPassword(credentials)`, `reloadSession()`
 * (depois do aceite do termo), `completeFirstAccess(newPassword)`,
 * `changePassword(passwords)` e `signOut()`.
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

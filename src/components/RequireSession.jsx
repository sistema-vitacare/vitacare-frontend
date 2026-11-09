import { Navigate, Outlet } from 'react-router';
import { PATHS } from '../constants/routes.js';
import { useSession } from '../hooks/useSession.js';

/**
 * Libera as rotas filhas só com sessão ativa. Sem sessão, ou com a sessão
 * expirada, leva ao login; no segundo caso, o próprio login mostra o aviso,
 * porque o estado `expired` continua na sessão até a próxima entrada.
 */
export default function RequireSession() {
  const { status } = useSession();
  if (status !== 'authenticated') {
    return <Navigate to={PATHS.LOGIN} replace />;
  }
  return <Outlet />;
}

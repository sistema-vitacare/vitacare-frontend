import { Navigate } from 'react-router';
import { homePath } from '../constants/routes.js';
import { useSession } from '../hooks/useSession.js';

/**
 * Endereço raiz: leva à página inicial escolhida pelas permissões da sessão.
 * Sem nenhuma página permitida, renderiza `fallback` em vez de redirecionar
 * em círculo entre a raiz e o login.
 */
export default function HomeRedirect({ fallback = null }) {
  const { can } = useSession();
  const path = homePath(can);
  return path ? <Navigate to={path} replace /> : fallback;
}

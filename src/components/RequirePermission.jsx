import { useSession } from '../hooks/useSession.js';

/**
 * Renderiza `children` só quando a sessão tem `permission`; senão, renderiza
 * `fallback`. O conteúdo protegido nem chega a montar, então também não
 * dispara a carga de dados.
 */
export default function RequirePermission({
  permission,
  fallback = null,
  children,
}) {
  const { can } = useSession();
  return can(permission) ? children : fallback;
}

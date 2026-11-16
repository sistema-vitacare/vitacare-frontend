import OrganizationList from './OrganizationList.jsx';
import PendingRequests from './PendingRequests.jsx';

/**
 * Organizações (UC03 e UC04), a página inicial do administrador da
 * plataforma: a fila de solicitações em análise no topo e a lista das
 * organizações clientes.
 */
export default function OrganizationListPage() {
  return (
    <OrganizationList>
      <PendingRequests />
    </OrganizationList>
  );
}

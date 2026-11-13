// Organizações clientes para o administrador da plataforma, no formato de
// GET /organizations (manual `organizations-listar.md`, conferido em
// 12/11/2026). Por ora só a lista, que o filtro da auditoria usa; o cadastro,
// a edição e a situação entram com a tela de organizações (FE-27).
import { PERMISSIONS as P } from '../constants/permissions.js';
import { currentViewer } from './authService.js';
import { mockRequest, paginate, requirePermission } from './mockApi.js';
import { allClientOrganizations } from './organizationStore.js';

export function listOrganizations({ status, search, page, limit } = {}) {
  return mockRequest(() => {
    requirePermission(currentViewer(), P.PLATFORM_ORGANIZATIONS_READ);
    const term = search?.trim().toLowerCase();
    const items = allClientOrganizations()
      .filter((item) => !status || item.status === status)
      .filter(
        (item) =>
          !term ||
          [item.tradeName, item.legalName, item.code].some((value) =>
            value?.toLowerCase().includes(term),
          ),
      )
      .sort((a, b) => a.tradeName.localeCompare(b.tradeName, 'pt-BR'));
    return paginate(items, { page, limit });
  });
}

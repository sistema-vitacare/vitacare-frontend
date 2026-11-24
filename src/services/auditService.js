// Auditoria pelas rotas `audit-events` da API (manual `audit-events-*.md`,
// conferido em 24/11/2026 no commit `3beebe3` do backend). A API confere a
// permissão e o alcance, filtra, pagina, mascara os nomes de pessoas de outra
// organização para o administrador da plataforma e monta o CSV.
import { apiDownload, apiGet, apiPath } from './apiClient.js';

/** Eventos com os filtros da tela, a página e o limite. */
export function listAuditEvents(query = {}) {
  return apiGet('/audit-events', query);
}

/** Catálogo das ações auditadas, com rótulo e gravidade. */
export function listAuditActions() {
  return apiGet('/audit-events/actions');
}

export function getAuditEvent(eventId) {
  return apiGet(apiPath`/audit-events/${eventId}`);
}

/** CSV com os mesmos filtros da lista, sem página. */
export function exportAuditEvents(query = {}) {
  return apiDownload('/audit-events/export', query);
}

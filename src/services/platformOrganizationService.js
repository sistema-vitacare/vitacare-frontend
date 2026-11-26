// Organizações clientes para o administrador da plataforma, pelas rotas
// `organizations` e `organizations/{organizationId}` da API (manual
// `organizations-*.md`, conferido em 26/11/2026 no commit `3beebe3` do
// backend). O plano de cada organização fica em `organizationService.js`,
// junto do plano da organização da sessão.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

// A organização já está na situação que a ação pediria: outra pessoa ou
// outra aba a mudou. Tentar de novo falharia igual, então a tela recarrega e
// mostra a mensagem.
export const ORGANIZATION_STALE_CODES = Object.freeze([
  'ORGANIZATION_ALREADY_INACTIVE',
  'ORGANIZATION_ALREADY_ACTIVE',
]);

/** Organizações clientes, sem a de plataforma, com busca, situação e página. */
export function listOrganizations(query = {}) {
  return apiGet('/organizations', query);
}

export function getOrganization(organizationId) {
  return apiGet(apiPath`/organizations/${organizationId}`);
}

/**
 * Cadastro com o primeiro administrador numa operação só. A senha
 * provisória dele só existe nesta resposta e vale até o primeiro acesso.
 */
export function createOrganization(body) {
  return apiPost('/organizations', body);
}

/** O mesmo corpo de `PATCH /organizations/me`, também na organização inativa. */
export function updateOrganization(organizationId, body) {
  return apiPatch(apiPath`/organizations/${organizationId}`, body);
}

/** Corta na hora o acesso de todos os usuários da organização. */
export function deactivateOrganization(organizationId) {
  return apiPost(apiPath`/organizations/${organizationId}/deactivate`);
}

/** Sessões e convites revogados na inativação não voltam. */
export function reactivateOrganization(organizationId) {
  return apiPost(apiPath`/organizations/${organizationId}/reactivate`);
}

// Organização da sessão, plano, catálogo e solicitações de mudança de plano
// pelas rotas `organizations/me`, `plans` e `plan-change-requests` da API, e o
// plano das organizações clientes pela plataforma (manual
// `organizations-*-propria.md`, `plans-*.md` e `plan-change-requests-*.md`,
// conferido em 26/11/2026 no commit `3beebe3` do backend). A API confere a
// permissão e as regras do termo, calcula limites e uso e monta o aviso de
// vencimento.
import { apiGet, apiPatch, apiPath, apiPost, apiPut } from './apiClient.js';

// A solicitação já não está como a tela a carregou: outra pessoa a decidiu
// ou cancelou, ou fez outra no lugar. Tentar de novo falharia igual, então a
// tela recarrega e mostra a mensagem.
export const PLAN_REQUEST_STALE_CODES = Object.freeze([
  'PLAN_CHANGE_REQUEST_NOT_PENDING',
  'PLAN_CHANGE_REQUEST_ALREADY_PENDING',
]);

export function getOwnOrganization() {
  return apiGet('/organizations/me');
}

/** Só os campos enviados mudam; nulo limpa os opcionais. */
export function updateOwnOrganization(body) {
  return apiPatch('/organizations/me', body);
}

/** Plano, vigência, limites, uso e solicitação pendente; o aviso vem na `meta.message`. */
export function getOwnPlan() {
  return apiGet('/organizations/me/plan');
}

export function getOrganizationPlan(organizationId) {
  return apiGet(apiPath`/organizations/${organizationId}/plan`);
}

/** O corpo descreve o termo inteiro: campo omitido volta ao padrão do catálogo. */
export function assignOrganizationPlan(organizationId, body) {
  return apiPut(apiPath`/organizations/${organizationId}/plan`, body);
}

export function listPlans() {
  return apiGet('/plans');
}

/** Na organização cliente, a API ignora o filtro de organização. */
export function listChangeRequests(query = {}) {
  return apiGet('/plan-change-requests', query);
}

export function createChangeRequest(body) {
  return apiPost('/plan-change-requests', body);
}

export function cancelChangeRequest(requestId) {
  return apiPost(apiPath`/plan-change-requests/${requestId}/cancel`);
}

/** Data de fim, limites e justificativa opcionais, pela regra da atribuição. */
export function approveChangeRequest(requestId, body) {
  return apiPost(apiPath`/plan-change-requests/${requestId}/approve`, body);
}

/** A justificativa é obrigatória, e a organização a vê. */
export function rejectChangeRequest(requestId, body) {
  return apiPost(apiPath`/plan-change-requests/${requestId}/reject`, body);
}

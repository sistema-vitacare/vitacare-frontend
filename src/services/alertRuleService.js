// Regras de alerta pelas rotas `alert-rules` da API (manual
// `alert-rules-*.md`, conferido em 25/11/2026 no commit `3beebe3` do
// backend). A API confere o formulário, o campo, o paciente e o alcance.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

export function listAlertRules(query = {}) {
  return apiGet('/alert-rules', query);
}

export function createAlertRule(body) {
  return apiPost('/alert-rules', body);
}

export function updateAlertRule(ruleId, body) {
  return apiPatch(apiPath`/alert-rules/${ruleId}`, body);
}

export function deactivateAlertRule(ruleId) {
  return apiPost(apiPath`/alert-rules/${ruleId}/deactivate`);
}

export function reactivateAlertRule(ruleId) {
  return apiPost(apiPath`/alert-rules/${ruleId}/reactivate`);
}

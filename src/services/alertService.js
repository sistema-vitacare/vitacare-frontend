// Alertas pelas rotas `alerts` da API (manual `alerts-*.md`, conferido em
// 25/11/2026 no commit `3beebe3` do backend). Sem `patientId`, a lista e o
// resumo trazem os alertas de todos os pacientes ao alcance da sessão; a API
// gera, ordena e conta os alertas.
import { apiGet, apiPath, apiPost } from './apiClient.js';

/** Alerta que outra pessoa resolveu antes: a tela recarrega. */
export const ALERT_STALE_CODES = Object.freeze(['ALERT_ALREADY_RESOLVED']);

export function listAlerts(query = {}) {
  return apiGet('/alerts', query);
}

export function getAlertSummary(query = {}) {
  return apiGet('/alerts/summary', query);
}

export function getAlert(alertId) {
  return apiGet(apiPath`/alerts/${alertId}`);
}

export function resolveAlert(alertId) {
  return apiPost(apiPath`/alerts/${alertId}/resolve`);
}

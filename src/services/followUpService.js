// Registros de acompanhamento pelas rotas `follow-ups` da API (manual
// `follow-ups-*.md`, conferido em 24/11/2026 no commit `3beebe3` do
// backend). A API aplica o alcance de cada perfil, esconde o anulado do
// familiar e gera os alertas do registro.
import { apiGet, apiPath, apiPost } from './apiClient.js';

/** Registros de um paciente (`patientId`), com os filtros da tela. */
export function listFollowUps(query = {}) {
  return apiGet('/follow-ups', query);
}

export function getFollowUp(followUpId) {
  return apiGet(apiPath`/follow-ups/${followUpId}`);
}

/** `body.formVersionId` é a versão que a tela mostrou. */
export function createFollowUp(body) {
  return apiPost('/follow-ups', body);
}

export function annulFollowUp(followUpId, { reason } = {}) {
  return apiPost(apiPath`/follow-ups/${followUpId}/annul`, { reason });
}

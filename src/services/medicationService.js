// Medicamentos pelas rotas `medications` da API (manual `medications-*.md`,
// conferido em 25/11/2026 no commit `3beebe3` do backend). A API aplica o
// alcance de cada perfil, as regras dos campos e calcula o próximo horário e
// o horário coincidente.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

export function listMedications(query = {}) {
  return apiGet('/medications', query);
}

export function createMedication(body) {
  return apiPost('/medications', body);
}

export function updateMedication(medicationId, body) {
  return apiPatch(apiPath`/medications/${medicationId}`, body);
}

export function deactivateMedication(medicationId) {
  return apiPost(apiPath`/medications/${medicationId}/deactivate`);
}

export function reactivateMedication(medicationId) {
  return apiPost(apiPath`/medications/${medicationId}/reactivate`);
}

// Pacientes pelas rotas `patients` da API (manual `patients-*.md`, conferido
// em 23/11/2026 no commit `3beebe3` do backend). A API aplica o alcance de
// cada perfil, a máscara do familiar e a mensagem da lista vazia.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

export const PATIENT_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'PATIENT_NOT_FOUND',
  DUPLICATE_CPF: 'PATIENT_DUPLICATE_CPF',
  INVALID_RESPONSIBLE: 'PATIENT_INVALID_RESPONSIBLE',
  INACTIVE: 'PATIENT_INACTIVE',
  ALREADY_INACTIVE: 'PATIENT_ALREADY_INACTIVE',
  ALREADY_ACTIVE: 'PATIENT_ALREADY_ACTIVE',
  PLAN_LIMIT_REACHED: 'PATIENT_PLAN_LIMIT_REACHED',
  PLAN_EXPIRED: 'PATIENT_PLAN_EXPIRED',
});

/** Situação já mudada por outra pessoa ou em outra aba: a tela recarrega. */
export const PATIENT_STALE_CODES = Object.freeze([
  PATIENT_ERROR_CODES.ALREADY_INACTIVE,
  PATIENT_ERROR_CODES.ALREADY_ACTIVE,
]);

export function listPatients(query = {}) {
  return apiGet('/patients', query);
}

export function getPatient(patientId) {
  return apiGet(apiPath`/patients/${patientId}`);
}

export function createPatient(payload) {
  return apiPost('/patients', payload);
}

/** `changes` leva só os campos alterados; campo ausente não muda. */
export function updatePatient(patientId, changes) {
  return apiPatch(apiPath`/patients/${patientId}`, changes);
}

export function deactivatePatient(patientId) {
  return apiPost(apiPath`/patients/${patientId}/deactivate`);
}

export function reactivatePatient(patientId) {
  return apiPost(apiPath`/patients/${patientId}/reactivate`);
}

export function getPatientOverview(patientId) {
  return apiGet(apiPath`/patients/${patientId}/overview`);
}

export function getPatientEvolution(patientId, query = {}) {
  return apiGet(apiPath`/patients/${patientId}/evolution`, query);
}

// Vínculos usuário–paciente pelas rotas `patient-links` da API (manual
// `patient-links-*.md`, conferido em 23/11/2026 no commit `3beebe3` do
// backend). O papel vem do perfil do usuário, e o vínculo de responsável só
// muda na edição do paciente.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

export const LINK_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'PATIENT_LINK_NOT_FOUND',
  ALREADY_EXISTS: 'PATIENT_LINK_ALREADY_EXISTS',
  INVALID_USER: 'PATIENT_LINK_INVALID_USER',
  RESPONSIBLE_READ_ONLY: 'PATIENT_LINK_RESPONSIBLE_READ_ONLY',
  REVOKED: 'PATIENT_LINK_REVOKED',
  PATIENT_INACTIVE: 'PATIENT_INACTIVE',
});

const ROLE_ORDER = ['responsible_professional', 'caregiver', 'family'];

function byRoleAndName(a, b) {
  return (
    ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
    a.user.name.localeCompare(b.user.name, 'pt-BR')
  );
}

/**
 * Vínculos de um paciente. A API ordena pela criação, o que poria o
 * responsável, em geral o mais antigo, no fim; a equipe de cuidado o mostra
 * primeiro, depois cuidadores e familiares.
 */
export async function listPatientLinks(query) {
  const response = await apiGet('/patient-links', query);
  return { ...response, data: [...response.data].sort(byRoleAndName) };
}

/** Usuários que podem ocupar o papel: só id, nome, perfil e situação. */
export function listEligibleUsers(query) {
  return apiGet('/patient-links/eligible-users', query);
}

export function createPatientLink(body) {
  return apiPost('/patient-links', body);
}

export function updatePatientLink(linkId, body) {
  return apiPatch(apiPath`/patient-links/${linkId}`, body);
}

export function revokePatientLink(linkId) {
  return apiPost(apiPath`/patient-links/${linkId}/revoke`);
}

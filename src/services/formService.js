// Formulários pelas rotas `forms` da API (manual `forms-*.md`, conferido em
// 24/11/2026 no commit `3beebe3` do backend). A API aplica o alcance de cada
// perfil, as regras dos campos e o versionamento.
import { apiGet, apiPatch, apiPath, apiPost, apiPut } from './apiClient.js';

export function listForms(query = {}) {
  return apiGet('/forms', query);
}

export function getForm(formId) {
  return apiGet(apiPath`/forms/${formId}`);
}

export function createForm(body) {
  return apiPost('/forms', body);
}

export function updateForm(formId, body) {
  return apiPatch(apiPath`/forms/${formId}`, body);
}

/** Troca a lista inteira de campos do rascunho. */
export function saveFormDraft(formId, { fields } = {}) {
  return apiPut(apiPath`/forms/${formId}/draft`, { fields });
}

/** Sobre uma versão vigente, a API pede `{ confirmImpact: true }`. */
export function publishForm(formId, body = {}) {
  return apiPost(apiPath`/forms/${formId}/publish`, body);
}

export function discardFormDraft(formId) {
  return apiPost(apiPath`/forms/${formId}/draft/discard`);
}

export function deactivateForm(formId) {
  return apiPost(apiPath`/forms/${formId}/deactivate`);
}

export function reactivateForm(formId) {
  return apiPost(apiPath`/forms/${formId}/reactivate`);
}

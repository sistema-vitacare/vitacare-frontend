// Formulários simulados que as regras de alerta ainda leem, até o FE-57. As
// telas de formulários e de registros leem a API desde o Bloco 11, e nada
// mais altera estes formulários.
import { forms as seedForms } from '../data/mocks/forms.js';
import { ApiError } from './mockApi.js';

export function findForm(formId) {
  return seedForms.find((form) => form.id === formId) ?? null;
}

/** Versão vigente: a publicada de maior número, ou `null` sem publicação. */
export function currentVersion(form) {
  return form.versions.at(-1) ?? null;
}

export function appliesTo(form, patientId) {
  return (
    form.audience === 'organization' || form.patientIds.includes(patientId)
  );
}

export function formNotFound() {
  return new ApiError({
    status: 404,
    code: 'FORM_NOT_FOUND',
    message: 'Formulário não encontrado.',
  });
}

// Estado simulado dos formulários, compartilhado pelos serviços de
// formulários e de registros. Guarda o que a API guardaria no banco
// (formulário novo, dados alterados, rascunho, publicação e desativação) e
// aplica o alcance de cada perfil, como os casos de uso de `Form` do backend.
import { forms as seedForms } from '../data/mocks/forms.js';
import { enabledFieldCount } from '../utils/formFields.js';
import { ApiError, registerMockState } from './mockApi.js';
import { canReach, readsWholeOrganization } from './patientStore.js';

let createdForms = [];
let formChanges = new Map();

registerMockState(() => {
  createdForms = [];
  formChanges = new Map();
});

export function allForms() {
  return [
    ...seedForms.map((form) => ({ ...form, ...formChanges.get(form.id) })),
    ...createdForms,
  ];
}

export function findForm(formId) {
  return allForms().find((form) => form.id === formId) ?? null;
}

export function addForm(form) {
  createdForms = [...createdForms, form];
}

export function changeForm(formId, changes) {
  if (createdForms.some((form) => form.id === formId)) {
    createdForms = createdForms.map((form) =>
      form.id === formId ? { ...form, ...changes } : form,
    );
    return;
  }
  formChanges.set(formId, { ...formChanges.get(formId), ...changes });
}

/** Versão vigente: a publicada de maior número, ou `null` sem publicação. */
export function currentVersion(form) {
  return form.versions.at(-1) ?? null;
}

/** Chaves conhecidas do formulário (versões publicadas e rascunho vivo), com o tipo. */
export function knownFieldTypes(form) {
  const versions = [...form.versions, ...(form.draft ? [form.draft] : [])];
  return new Map(
    versions.flatMap((version) =>
      version.fields.map((field) => [field.fieldKey, field.fieldType]),
    ),
  );
}

export function appliesTo(form, patientId) {
  return (
    form.audience === 'organization' || form.patientIds.includes(patientId)
  );
}

/**
 * Administrador e profissional leem todos os formulários; o cuidador, só os
 * ativos que valem para a organização inteira ou para um paciente dele.
 */
export function canReadForm(viewer, form) {
  if (readsWholeOrganization(viewer)) {
    return true;
  }
  return (
    form.status === 'active' &&
    (form.audience === 'organization' ||
      form.patientIds.some((patientId) => canReach(viewer, patientId)))
  );
}

export function formNotFound() {
  return new ApiError({
    status: 404,
    code: 'FORM_NOT_FOUND',
    message: 'Formulário não encontrado.',
  });
}

function versionView(version, { withFields }) {
  return {
    id: version.id,
    number: version.number,
    publishedAt: version.publishedAt,
    fieldCount: enabledFieldCount(version.fields),
    ...(withFields ? { fields: version.fields } : {}),
  };
}

/**
 * Formulário como a API o devolve para a sessão: o resumo da listagem ou o
 * detalhe com os campos. O cuidador recebe a lista de pacientes recortada
 * ao alcance dele e nunca o rascunho.
 */
export function formForViewer(form, viewer, { summary = false } = {}) {
  const configures = readsWholeOrganization(viewer);
  const current = currentVersion(form);
  return {
    id: form.id,
    name: form.name,
    description: form.description,
    trackingType: form.trackingType,
    status: form.status,
    audience: form.audience,
    patientIds: configures
      ? form.patientIds
      : form.patientIds.filter((patientId) => canReach(viewer, patientId)),
    frequency: form.frequency,
    hasDraft: configures && form.draft !== null,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    deactivatedAt: form.deactivatedAt,
    currentVersion: current
      ? versionView(current, { withFields: !summary })
      : null,
    ...(configures && !summary ? { draft: form.draft } : {}),
  };
}

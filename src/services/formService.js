// Formulários de acompanhamento simulados, no formato das rotas `forms` da
// API (manual `forms-*.md`, conferido em 11/11/2026 no commit `dc0af9c` do
// backend). Na integração, cada função passa a chamar a rota
// correspondente.
import { PERMISSIONS as P } from '../constants/permissions.js';
import {
  checkFieldKeys,
  checkFormFields,
  enabledFieldCount,
  fieldContractErrors,
  formDataErrors,
} from '../utils/formFields.js';
import { currentViewer } from './authService.js';
import {
  addForm,
  allForms,
  appliesTo,
  canReadForm,
  changeForm,
  currentVersion,
  findForm,
  formForViewer,
  formNotFound,
  knownFieldTypes,
} from './formStore.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { findPatient, nextId, reachablePatient } from './patientStore.js';

const EDITABLE = [
  'name',
  'description',
  'trackingType',
  'frequency',
  'audience',
  'patientIds',
];

function conflict(code, message, fields = null) {
  return new ApiError({ status: 409, code, message, fields });
}

function unprocessable(code, message, fields = null) {
  return new ApiError({ status: 422, code, message, fields });
}

const formEmpty = () =>
  unprocessable('FORM_EMPTY', 'Inclua ao menos um campo no formulário.', [
    { field: 'fields', code: 'EMPTY' },
  ]);

const invalidFields = (fields) =>
  unprocessable(
    'FORM_INVALID_FIELDS',
    'Revise a configuração dos campos indicados.',
    fields,
  );

const formInactive = () =>
  conflict('FORM_INACTIVE', 'O formulário está desativado.');

const trimOrNull = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function normalizeField(field) {
  return {
    fieldKey: field.fieldKey
      ? String(field.fieldKey).trim().toLowerCase()
      : null,
    name: field.name.trim(),
    fieldType: field.fieldType,
    requirement: field.requirement,
    section: trimOrNull(field.section),
    unit: trimOrNull(field.unit),
    decimalPlaces: field.decimalPlaces ?? null,
    scaleMin: field.scaleMin ?? null,
    scaleMax: field.scaleMax ?? null,
    options: field.options
      ? field.options.map((option) => option.trim())
      : null,
  };
}

/** Campos coerentes e não vazios, na ordem da API: contrato, vazio, coerência. */
function configurableFields(rawFields, contractErrors = []) {
  const errors = [...contractErrors, ...fieldContractErrors(rawFields)];
  if (errors.length > 0) {
    throw validationError(errors);
  }
  const fields = rawFields.map(normalizeField);
  if (fields.length === 0) {
    throw formEmpty();
  }
  const coherence = checkFormFields(fields);
  if (coherence.length > 0) {
    throw invalidFields(coherence);
  }
  return fields;
}

// Cada versão tem os seus campos: o id muda a cada salvamento, e a chave
// liga o campo entre versões.
function versionFields(fields) {
  return fields.map((field, position) => ({
    id: nextId('f1e10000'),
    ...field,
    fieldKey: field.fieldKey ?? nextId('f1e20000'),
    position,
  }));
}

// Só os pacientes que entram na lista precisam estar ativos: quem já
// estava pode ter sido inativado depois, e o vínculo é preservado.
function assertPatients(patientIds, previous = []) {
  const invalid = patientIds
    .filter((patientId) => !previous.includes(patientId))
    .some((patientId) => findPatient(patientId)?.status !== 'active');
  if (invalid) {
    throw unprocessable(
      'FORM_INVALID_PATIENTS',
      'Algum paciente da lista não pode receber o formulário.',
      [{ field: 'patientIds', code: 'INVALID_PATIENT' }],
    );
  }
}

function existingForm(formId) {
  const form = findForm(formId);
  if (!form) {
    throw formNotFound();
  }
  return form;
}

function editableForm(formId) {
  const form = existingForm(formId);
  if (form.status === 'inactive') {
    throw formInactive();
  }
  return form;
}

function respondWith(formId, viewer) {
  return respond(formForViewer(findForm(formId), viewer));
}

/**
 * Formulários ao alcance da sessão, por nome. Com `patientId`, só os ativos
 * que valem para o paciente, que é a pergunta do registro de visita.
 */
export function listForms({ status, search, patientId, page, limit } = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_READ);
    if (patientId) {
      reachablePatient(viewer, patientId);
    }
    const term = search?.trim().toLowerCase();
    const items = allForms()
      .filter((form) => canReadForm(viewer, form))
      .filter((form) => !status || form.status === status)
      .filter((form) => !term || form.name.toLowerCase().includes(term))
      .filter(
        (form) =>
          !patientId ||
          (form.status === 'active' && appliesTo(form, patientId)),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id),
      )
      .map((form) => formForViewer(form, viewer, { summary: true }));
    return paginate(items, { page, limit });
  });
}

export function getForm(formId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_READ);
    const form = findForm(formId);
    // Fora do alcance do cuidador responde como inexistente.
    if (!form || !canReadForm(viewer, form)) {
      throw formNotFound();
    }
    return respond(formForViewer(form, viewer));
  });
}

/** Cria o formulário em rascunho; ele só vale para registro depois de publicado. */
export function createForm(body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_CREATE);
    const fields = configurableFields(body.fields, formDataErrors(body));
    // Na criação nenhuma chave é conhecida.
    const keyErrors = checkFieldKeys(fields, new Map());
    if (keyErrors.length > 0) {
      throw invalidFields(keyErrors);
    }
    const patientIds = body.audience === 'patients' ? body.patientIds : [];
    assertPatients(patientIds);
    const now = new Date().toISOString();
    const form = {
      id: nextId('f0a10000'),
      name: body.name.trim(),
      description: trimOrNull(body.description),
      trackingType: trimOrNull(body.trackingType),
      status: 'draft',
      audience: body.audience,
      patientIds,
      frequency: body.frequency ?? null,
      createdAt: now,
      updatedAt: now,
      deactivatedAt: null,
      versions: [],
      draft: {
        id: nextId('d0a10000'),
        updatedAt: now,
        fields: versionFields(fields),
      },
    };
    addForm(form);
    return respond(formForViewer(form, viewer));
  });
}

/** Altera dados, frequência e público, sem nova versão; os campos não mudam aqui. */
export function updateForm(formId, body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_UPDATE);
    const unknown = Object.keys(body)
      .filter((key) => !EDITABLE.includes(key))
      .map((key) => ({ field: key, code: 'WHITELIST_VALIDATION' }));
    const errors = [...formDataErrors(body, { partial: true }), ...unknown];
    if (errors.length > 0) {
      throw validationError(errors);
    }
    if (!EDITABLE.some((key) => key in body)) {
      throw unprocessable(
        'FORM_NOTHING_TO_UPDATE',
        'Nenhuma alteração foi enviada.',
      );
    }
    const form = editableForm(formId);
    const changes = {};
    if ('name' in body) {
      changes.name = body.name.trim();
    }
    for (const key of ['description', 'trackingType']) {
      if (key in body) {
        changes[key] = trimOrNull(body[key]);
      }
    }
    if ('frequency' in body) {
      changes.frequency = body.frequency;
    }
    if ('audience' in body) {
      changes.audience = body.audience;
      changes.patientIds = body.audience === 'patients' ? body.patientIds : [];
    }
    const changed = Object.entries(changes).some(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(form[key]),
    );
    // Sem mudança real, devolve o formulário como está, sem gravar.
    if (!changed) {
      return respond(formForViewer(form, viewer));
    }
    if (changes.patientIds) {
      assertPatients(changes.patientIds, form.patientIds);
    }
    changeForm(form.id, { ...changes, updatedAt: new Date().toISOString() });
    return respondWith(form.id, viewer);
  });
}

/** Cria ou substitui o rascunho da próxima versão; a vigente não muda. */
export function saveFormDraft(formId, { fields: rawFields } = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_UPDATE);
    const fields = configurableFields(rawFields);
    const form = editableForm(formId);
    const keyErrors = checkFieldKeys(fields, knownFieldTypes(form));
    if (keyErrors.length > 0) {
      throw invalidFields(keyErrors);
    }
    changeForm(form.id, {
      draft: {
        id: form.draft?.id ?? nextId('d0a10000'),
        updatedAt: new Date().toISOString(),
        fields: versionFields(fields),
      },
    });
    return respondWith(form.id, viewer);
  });
}

/**
 * Publica o rascunho como a versão seguinte. Sobre uma versão vigente,
 * exige `confirmImpact`: os registros novos passam a usar a versão nova.
 */
export function publishForm(formId, { confirmImpact = false } = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_UPDATE);
    if (typeof confirmImpact !== 'boolean') {
      throw validationError([{ field: 'confirmImpact', code: 'IS_BOOLEAN' }]);
    }
    const form = editableForm(formId);
    if (!form.draft) {
      throw conflict('FORM_NO_DRAFT', 'Não há rascunho para publicar.');
    }
    if (enabledFieldCount(form.draft.fields) === 0) {
      throw formEmpty();
    }
    const current = currentVersion(form);
    if (current && !confirmImpact) {
      throw conflict(
        'FORM_IMPACT_CONFIRMATION_REQUIRED',
        'Confirme que a nova versão substitui a vigente.',
        [{ field: 'confirmImpact', code: 'REQUIRED' }],
      );
    }
    const now = new Date().toISOString();
    changeForm(form.id, {
      status: 'active',
      updatedAt: now,
      versions: [
        ...form.versions,
        {
          id: form.draft.id,
          number: (current?.number ?? 0) + 1,
          publishedAt: now,
          fields: form.draft.fields,
        },
      ],
      draft: null,
    });
    return respondWith(form.id, viewer);
  });
}

/** Abandona o rascunho de um formulário publicado; a versão vigente continua. */
export function discardFormDraft(formId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_UPDATE);
    const form = editableForm(formId);
    if (!form.draft) {
      throw conflict('FORM_NO_DRAFT', 'Não há rascunho para descartar.');
    }
    // Sem versão publicada, o rascunho é todo o formulário.
    if (form.versions.length === 0) {
      throw conflict(
        'FORM_NOT_PUBLISHED',
        'O formulário nunca foi publicado; para tirá-lo de uso, desative-o.',
      );
    }
    changeForm(form.id, { draft: null });
    return respondWith(form.id, viewer);
  });
}

/** Desativa preservando versões, rascunho e registros. */
export function deactivateForm(formId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_DEACTIVATE);
    const form = existingForm(formId);
    if (form.status === 'inactive') {
      throw conflict(
        'FORM_ALREADY_INACTIVE',
        'O formulário já está desativado.',
      );
    }
    const now = new Date().toISOString();
    changeForm(form.id, {
      status: 'inactive',
      deactivatedAt: now,
      updatedAt: now,
    });
    return respondWith(form.id, viewer);
  });
}

/** Volta a `active` com versão publicada, ou a `draft` sem ela. */
export function reactivateForm(formId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FORMS_DEACTIVATE);
    const form = existingForm(formId);
    if (form.status !== 'inactive') {
      throw conflict(
        'FORM_ALREADY_ACTIVE',
        'O formulário não está desativado.',
      );
    }
    changeForm(form.id, {
      status: form.versions.length > 0 ? 'active' : 'draft',
      deactivatedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return respondWith(form.id, viewer);
  });
}

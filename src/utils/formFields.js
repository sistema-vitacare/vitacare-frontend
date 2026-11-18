// Regras dos campos e dos dados de um formulário, as mesmas da API: o
// contrato do DTO (422 VALIDATION_FAILED), a coerência de cada campo com o
// tipo e a unicidade (`formFields.policy.ts` do backend, 422
// FORM_INVALID_FIELDS). A tela confere antes de enviar e o serviço simulado
// recusa do mesmo jeito que a API.
import {
  AUDIENCES,
  FIELD_TYPES,
  FREQUENCY_UNITS,
  REQUIREMENTS,
} from '../constants/formFields.js';

export const FORM_LIMITS = Object.freeze({
  name: 120,
  description: 1000,
  trackingType: 80,
  fieldName: 120,
  section: 60,
  unit: 20,
  option: 120,
  minOptions: 2,
  maxOptions: 50,
  maxFields: 100,
  maxDecimalPlaces: 3,
  scaleBound: 1000,
  maxInterval: 365,
  maxPatients: 500,
});

const TYPED_PROPERTIES = [
  'unit',
  'decimalPlaces',
  'scaleMin',
  'scaleMax',
  'options',
];

// O que cada tipo exige e o que aceita além disso; o resto é proibido.
const TYPE_RULES = {
  number: { required: ['decimalPlaces'], optional: ['unit'] },
  scale: { required: ['scaleMin', 'scaleMax'], optional: [] },
  boolean: { required: [], optional: [] },
  text: { required: [], optional: [] },
  single_choice: { required: ['options'], optional: [] },
  multiple_choice: { required: ['options'], optional: [] },
};

const FIELD_PROPERTIES = new Set([
  'fieldKey',
  'name',
  'fieldType',
  'requirement',
  'section',
  ...TYPED_PROPERTIES,
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalize = (text) => text.trim().toLowerCase();

const isPresent = (value) => value !== null && value !== undefined;

const hasDuplicate = (values) =>
  new Set(values.map(normalize)).size !== values.length;

/** Texto obrigatório, aparado, com até `max` caracteres. */
function textError(value, max) {
  if (typeof value !== 'string') {
    return 'IS_STRING';
  }
  const length = value.trim().length;
  if (length === 0) {
    return 'MIN_LENGTH';
  }
  return length > max ? 'MAX_LENGTH' : null;
}

/** Texto opcional: `null` ou ausente vale; presente segue o obrigatório. */
function optionalTextError(value, max) {
  return isPresent(value) ? textError(value, max) : null;
}

function intError(value, min, max) {
  if (!isPresent(value)) {
    return null;
  }
  if (!Number.isInteger(value)) {
    return 'IS_INT';
  }
  if (value < min) {
    return 'MIN';
  }
  return value > max ? 'MAX' : null;
}

function optionsErrors(options, path) {
  if (!isPresent(options)) {
    return [];
  }
  if (!Array.isArray(options)) {
    return [{ field: path, code: 'IS_ARRAY' }];
  }
  if (options.length < FORM_LIMITS.minOptions) {
    return [{ field: path, code: 'ARRAY_MIN_SIZE' }];
  }
  if (options.length > FORM_LIMITS.maxOptions) {
    return [{ field: path, code: 'ARRAY_MAX_SIZE' }];
  }
  return options.flatMap((option, index) => {
    const code = textError(option, FORM_LIMITS.option);
    return code ? [{ field: `${path}.${index}`, code }] : [];
  });
}

/**
 * Contrato de cada campo enviado, como o DTO da API: tipos, tamanhos,
 * faixas e propriedades desconhecidas (o cliente reenvia o campo do `GET`
 * sem `id` e `position`).
 */
export function fieldContractErrors(fields) {
  if (!Array.isArray(fields)) {
    return [{ field: 'fields', code: 'IS_ARRAY' }];
  }
  if (fields.length > FORM_LIMITS.maxFields) {
    return [{ field: 'fields', code: 'ARRAY_MAX_SIZE' }];
  }
  const { scaleBound } = FORM_LIMITS;
  return fields.flatMap((field, index) => {
    const path = (property) => `fields.${index}.${property}`;
    const checks = [
      ['name', textError(field.name, FORM_LIMITS.fieldName)],
      ['fieldType', FIELD_TYPES.includes(field.fieldType) ? null : 'IS_IN'],
      [
        'requirement',
        REQUIREMENTS.includes(field.requirement) ? null : 'IS_IN',
      ],
      ['section', optionalTextError(field.section, FORM_LIMITS.section)],
      ['unit', optionalTextError(field.unit, FORM_LIMITS.unit)],
      [
        'decimalPlaces',
        intError(field.decimalPlaces, 0, FORM_LIMITS.maxDecimalPlaces),
      ],
      ['scaleMin', intError(field.scaleMin, -scaleBound, scaleBound)],
      ['scaleMax', intError(field.scaleMax, -scaleBound, scaleBound)],
      [
        'fieldKey',
        isPresent(field.fieldKey) && !UUID.test(String(field.fieldKey).trim())
          ? 'IS_UUID'
          : null,
      ],
    ];
    const unknown = Object.keys(field)
      .filter((property) => !FIELD_PROPERTIES.has(property))
      .map((property) => ({
        field: path(property),
        code: 'WHITELIST_VALIDATION',
      }));
    return [
      ...checks
        .filter(([, code]) => code)
        .map(([property, code]) => ({ field: path(property), code })),
      ...optionsErrors(field.options, path('options')),
      ...unknown,
    ];
  });
}

/**
 * Coerência de cada campo com o seu tipo e unicidade de nome e chave na
 * versão. Aponta a segunda ocorrência de uma repetição.
 */
export function checkFormFields(fields) {
  const errors = [];
  const names = new Set();
  const keys = new Set();
  fields.forEach((field, index) => {
    const path = (property) => `fields.${index}.${property}`;
    const rules = TYPE_RULES[field.fieldType];
    for (const property of TYPED_PROPERTIES) {
      const present = isPresent(field[property]);
      if (rules.required.includes(property)) {
        if (!present) {
          errors.push({ field: path(property), code: 'REQUIRED' });
        }
      } else if (present && !rules.optional.includes(property)) {
        errors.push({ field: path(property), code: 'NOT_ALLOWED' });
      }
    }
    if (
      field.fieldType === 'scale' &&
      isPresent(field.scaleMin) &&
      isPresent(field.scaleMax) &&
      field.scaleMin >= field.scaleMax
    ) {
      errors.push({ field: path('scaleMax'), code: 'INVALID_RANGE' });
    }
    if (
      rules.required.includes('options') &&
      field.options &&
      hasDuplicate(field.options)
    ) {
      errors.push({ field: path('options'), code: 'DUPLICATE' });
    }
    const name = normalize(field.name);
    if (names.has(name)) {
      errors.push({ field: path('name'), code: 'DUPLICATE' });
    }
    names.add(name);
    if (field.fieldKey) {
      if (keys.has(field.fieldKey)) {
        errors.push({ field: path('fieldKey'), code: 'DUPLICATE' });
      }
      keys.add(field.fieldKey);
    }
  });
  return errors;
}

/**
 * A chave enviada tem de existir em `known` (versões publicadas e rascunho
 * vivo do mesmo formulário) e manter o tipo: mudar o tipo é criar campo
 * novo, sem chave.
 */
export function checkFieldKeys(fields, known) {
  return fields.flatMap((field, index) => {
    if (!field.fieldKey) {
      return [];
    }
    const knownType = known.get(field.fieldKey);
    if (knownType === undefined) {
      return [{ field: `fields.${index}.fieldKey`, code: 'UNKNOWN' }];
    }
    return knownType === field.fieldType
      ? []
      : [{ field: `fields.${index}.fieldType`, code: 'TYPE_LOCKED' }];
  });
}

function frequencyErrors(frequency) {
  if (!isPresent(frequency)) {
    return [];
  }
  const interval = isPresent(frequency.interval)
    ? intError(frequency.interval, 1, FORM_LIMITS.maxInterval)
    : 'IS_INT';
  const unit = FREQUENCY_UNITS.includes(frequency.unit) ? null : 'IS_IN';
  return [
    ...(interval ? [{ field: 'frequency.interval', code: interval }] : []),
    ...(unit ? [{ field: 'frequency.unit', code: unit }] : []),
  ];
}

/**
 * Dados do formulário (nome, descrição, tipo de acompanhamento,
 * frequência e público), como o DTO da criação ou, com `partial`, da
 * alteração: no parcial, só o que veio é conferido, e a lista de pacientes
 * exige o público junto.
 */
export function formDataErrors(data, { partial = false } = {}) {
  const has = (property) => !partial || property in data;
  const errors = [];
  if (has('name')) {
    const code = textError(data.name, FORM_LIMITS.name);
    if (code) {
      errors.push({ field: 'name', code });
    }
  }
  for (const property of ['description', 'trackingType']) {
    const code = has(property)
      ? optionalTextError(data[property], FORM_LIMITS[property])
      : null;
    if (code) {
      errors.push({ field: property, code });
    }
  }
  if (has('frequency')) {
    errors.push(...frequencyErrors(data.frequency));
  }
  // A lista vem só com o público por pacientes, e o público por pacientes
  // não vem sem lista; lista sem público, na alteração, também é recusada.
  const listSent = isPresent(data.patientIds);
  const audienceSent = isPresent(data.audience);
  if (!partial || audienceSent || listSent) {
    let code = null;
    if (!audienceSent) {
      code = listSent ? 'AUDIENCE_MATCHES_PATIENT_IDS' : 'IS_IN';
    } else if (!AUDIENCES.includes(data.audience)) {
      code = 'IS_IN';
    } else if (
      (data.audience === 'organization' && listSent) ||
      (data.audience === 'patients' &&
        !(Array.isArray(data.patientIds) && data.patientIds.length > 0))
    ) {
      code = 'AUDIENCE_MATCHES_PATIENT_IDS';
    }
    if (code) {
      errors.push({ field: 'audience', code });
    }
  }
  if (
    listSent &&
    (data.patientIds.length > FORM_LIMITS.maxPatients ||
      new Set(data.patientIds).size !== data.patientIds.length)
  ) {
    errors.push({ field: 'patientIds', code: 'ARRAY_UNIQUE' });
  }
  return errors;
}

/** Campos que a versão pede: os desabilitados ficam fora da contagem. */
export function enabledFieldCount(fields) {
  return fields.filter((field) => field.requirement !== 'disabled').length;
}

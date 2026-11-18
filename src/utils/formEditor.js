// Valores da tela de formulário (dados e campos) e a conversão para o corpo
// das rotas `forms` da API. A conferência usa as mesmas regras do serviço
// (`formFields.js`), para a tela apontar o problema antes do envio sem
// repetir as regras da API aqui.
import { CHOICE_TYPES } from '../constants/formFields.js';
import { FIELD_ERRORS } from './authValidation.js';
import {
  checkFormFields,
  fieldContractErrors,
  formDataErrors,
} from './formFields.js';

export const FORM_EDITOR_ERRORS = Object.freeze({
  ...FIELD_ERRORS,
  DUPLICATE: 'duplicate',
  INVALID_RANGE: 'invalidRange',
  TOO_FEW: 'tooFew',
  TOO_MANY: 'tooMany',
});

const E = FORM_EDITOR_ERRORS;

// Código da API para o código de erro da tela.
const SCREEN_CODES = {
  REQUIRED: E.REQUIRED,
  MIN_LENGTH: E.REQUIRED,
  IS_STRING: E.REQUIRED,
  AUDIENCE_MATCHES_PATIENT_IDS: E.REQUIRED,
  MAX_LENGTH: E.TOO_LONG,
  DUPLICATE: E.DUPLICATE,
  INVALID_RANGE: E.INVALID_RANGE,
  ARRAY_MIN_SIZE: E.TOO_FEW,
  ARRAY_MAX_SIZE: E.TOO_MANY,
};

const screenCode = (code) => SCREEN_CODES[code] ?? E.INVALID;

const textOrNull = (value) => {
  const text = value.trim();
  return text === '' ? null : text;
};

// Inteiro digitado; outro texto vira `NaN`, que a regra da API recusa.
function integerOrNull(text) {
  const value = String(text).trim();
  if (value === '') {
    return null;
  }
  return /^-?\d+$/.test(value) ? Number(value) : Number.NaN;
}

export function emptyFormValues() {
  return {
    name: '',
    description: '',
    trackingType: '',
    hasFrequency: false,
    interval: '1',
    unit: 'days',
    audience: 'organization',
    patientIds: [],
  };
}

export function formToValues(form) {
  return {
    name: form.name,
    description: form.description ?? '',
    trackingType: form.trackingType ?? '',
    hasFrequency: form.frequency !== null,
    interval: String(form.frequency?.interval ?? 1),
    unit: form.frequency?.unit ?? 'days',
    audience: form.audience,
    patientIds: form.patientIds,
  };
}

/** Dados do formulário no corpo da API; a lista de pacientes só vai com esse público. */
export function toFormDataPayload(values) {
  return {
    name: values.name.trim(),
    description: textOrNull(values.description),
    trackingType: textOrNull(values.trackingType),
    frequency: values.hasFrequency
      ? { interval: integerOrNull(values.interval), unit: values.unit }
      : null,
    audience: values.audience,
    ...(values.audience === 'patients'
      ? { patientIds: values.patientIds }
      : {}),
  };
}

// Propriedade da API para o campo da tela.
const DATA_FIELDS = {
  name: 'name',
  description: 'description',
  trackingType: 'trackingType',
  'frequency.interval': 'interval',
  'frequency.unit': 'unit',
  audience: 'patientIds',
};

/** Erros dos dados por campo da tela; objeto vazio quando tudo confere. */
export function validateFormData(values) {
  return Object.fromEntries(
    formDataErrors(toFormDataPayload(values)).map(({ field, code }) => [
      DATA_FIELDS[field] ?? field,
      screenCode(code),
    ]),
  );
}

export function emptyFieldValues() {
  return {
    fieldKey: null,
    name: '',
    fieldType: 'number',
    requirement: 'optional',
    section: '',
    unit: '',
    decimalPlaces: '0',
    scaleMin: '0',
    scaleMax: '10',
    options: '',
  };
}

/** Campo da API (ou do corpo já montado) para os valores do diálogo. */
export function fieldToValues(field) {
  return {
    fieldKey: field.fieldKey ?? null,
    name: field.name,
    fieldType: field.fieldType,
    requirement: field.requirement,
    section: field.section ?? '',
    unit: field.unit ?? '',
    decimalPlaces: String(field.decimalPlaces ?? 0),
    scaleMin: String(field.scaleMin ?? 0),
    scaleMax: String(field.scaleMax ?? 10),
    options: (field.options ?? []).join('\n'),
  };
}

/** Campo no corpo da API: só as propriedades que o tipo aceita, as demais nulas. */
export function toFieldPayload(values) {
  const { fieldType } = values;
  return {
    fieldKey: values.fieldKey,
    name: values.name.trim(),
    fieldType,
    requirement: values.requirement,
    section: textOrNull(values.section),
    unit: fieldType === 'number' ? textOrNull(values.unit) : null,
    decimalPlaces:
      fieldType === 'number' ? integerOrNull(values.decimalPlaces) : null,
    scaleMin: fieldType === 'scale' ? integerOrNull(values.scaleMin) : null,
    scaleMax: fieldType === 'scale' ? integerOrNull(values.scaleMax) : null,
    options: CHOICE_TYPES.includes(fieldType)
      ? values.options
          .split('\n')
          .map((option) => option.trim())
          .filter(Boolean)
      : null,
  };
}

/** Campo da lista da tela sem o identificador local, pronto para a API. */
export function toFieldInput(item) {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== 'uid'),
  );
}

/**
 * Erros do campo do diálogo por propriedade, conferido junto dos outros
 * campos do formulário (`others`, já no formato da API), porque o nome e a
 * chave não se repetem.
 */
export function validateField(values, others) {
  const all = [...others.map(toFieldInput), toFieldPayload(values)];
  const prefix = `fields.${others.length}.`;
  const errors = {};
  for (const { field, code } of [
    ...fieldContractErrors(all),
    ...checkFormFields(all),
  ]) {
    if (field.startsWith(prefix)) {
      const property = field.slice(prefix.length).split('.')[0];
      errors[property] ??= screenCode(code);
    }
  }
  return errors;
}

/** Campos agrupados pela seção, na ordem em que cada seção aparece primeiro. */
export function groupBySection(items) {
  const groups = new Map();
  for (const item of items) {
    const section = item.section ?? null;
    if (!groups.has(section)) {
      groups.set(section, { section, items: [] });
    }
    groups.get(section).items.push(item);
  }
  return [...groups.values()];
}

/**
 * Sobe (`-1`) ou desce (`1`) o campo dentro da seção dele. A lista volta
 * na ordem das seções, que é a ordem salva na API.
 */
export function moveWithinSection(items, uid, delta) {
  const groups = groupBySection(items);
  for (const group of groups) {
    const index = group.items.findIndex((item) => item.uid === uid);
    const target = index + delta;
    if (index >= 0 && target >= 0 && target < group.items.length) {
      const moved = [...group.items];
      [moved[index], moved[target]] = [moved[target], moved[index]];
      group.items = moved;
    }
  }
  return groups.flatMap((group) => group.items);
}

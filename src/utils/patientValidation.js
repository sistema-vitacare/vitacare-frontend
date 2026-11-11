// Regras do cadastro de paciente, iguais às do DTO de POST e PATCH
// /patients da API (manual `patients-criar.md`, conferido em 10/11/2026).
import { BRAZILIAN_STATES } from '../constants/brazil.js';
import { FIELD_ERRORS as E, validateEmail } from './authValidation.js';
import { isValidCpf } from './cpf.js';
import { digitsOnly, maskCpf, maskPhone, maskZipCode } from './masks.js';

export const PATIENT_ERRORS = Object.freeze({
  FUTURE_DATE: 'futureDate',
  TOO_OLD: 'tooOld',
  TOO_MANY: 'tooMany',
});

const MIN_BIRTH_DATE = '1900-01-01';
const MAX_SECONDARY_CONDITIONS = 20;

const ADDRESS_FIELDS = [
  'zipCode',
  'street',
  'number',
  'complement',
  'district',
  'city',
  'state',
];

// Tamanho máximo de cada texto livre, depois de aparar os espaços.
const MAX_LENGTH = {
  name: 180,
  street: 180,
  number: 20,
  complement: 120,
  district: 120,
  city: 120,
  mainCondition: 180,
  healthPlan: 180,
  notes: 2000,
};

const PHONE_PATTERN = /^[\d\s+()-]{1,32}$/;

export function emptyPatientValues() {
  return {
    name: '',
    birthDate: '',
    sex: '',
    cpf: '',
    phone: '',
    email: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    mainCondition: '',
    secondaryConditions: [],
    healthPlan: '',
    notes: '',
    responsibleUserId: '',
  };
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function birthDateError(value, today) {
  if (value === '') {
    return E.REQUIRED;
  }
  if (!isRealDate(value)) {
    return E.INVALID;
  }
  if (value > today) {
    return PATIENT_ERRORS.FUTURE_DATE;
  }
  return value < MIN_BIRTH_DATE ? PATIENT_ERRORS.TOO_OLD : null;
}

function secondaryConditionsError(list) {
  const items = list.map((item) => item.trim()).filter(Boolean);
  if (items.length > MAX_SECONDARY_CONDITIONS) {
    return PATIENT_ERRORS.TOO_MANY;
  }
  return items.some((item) => item.length > MAX_LENGTH.mainCondition)
    ? E.TOO_LONG
    : null;
}

/**
 * Erros do formulário por campo; objeto vazio quando tudo confere. `today`
 * é a data de Brasília (`AAAA-MM-DD`), limite do nascimento, como na API.
 */
export function validatePatient(values, today) {
  const errors = {};

  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (values[field].trim().length > max) {
      errors[field] = E.TOO_LONG;
    }
  }
  if (values.name.trim() === '') {
    errors.name = E.REQUIRED;
  }
  if (values.responsibleUserId === '') {
    errors.responsibleUserId = E.REQUIRED;
  }

  const checks = {
    birthDate: birthDateError(values.birthDate, today),
    cpf: values.cpf && !isValidCpf(values.cpf) ? E.INVALID : null,
    phone:
      values.phone && !PHONE_PATTERN.test(values.phone.trim())
        ? E.INVALID
        : null,
    email: values.email ? validateEmail(values.email) : null,
    zipCode:
      values.zipCode && digitsOnly(values.zipCode).length !== 8
        ? E.INVALID
        : null,
    state:
      values.state && !BRAZILIAN_STATES.includes(values.state.toUpperCase())
        ? E.INVALID
        : null,
    secondaryConditions: secondaryConditionsError(values.secondaryConditions),
  };
  for (const [field, error] of Object.entries(checks)) {
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
}

// A API recusa texto opcional vazio (`""`); campo em branco vai como null.
function textOrNull(value) {
  const text = value.trim();
  return text === '' ? null : text;
}

/** Corpo de POST e PATCH /patients a partir dos valores do formulário. */
export function toPatientPayload(values) {
  const cpf = digitsOnly(values.cpf);
  const zipCode = digitsOnly(values.zipCode);
  const email = textOrNull(values.email);
  const state = textOrNull(values.state);
  return {
    name: values.name.trim(),
    birthDate: values.birthDate,
    responsibleUserId: values.responsibleUserId,
    sex: values.sex || null,
    cpf: cpf || null,
    phone: textOrNull(values.phone),
    email: email && email.toLowerCase(),
    address: {
      zipCode: zipCode || null,
      street: textOrNull(values.street),
      number: textOrNull(values.number),
      complement: textOrNull(values.complement),
      district: textOrNull(values.district),
      city: textOrNull(values.city),
      state: state && state.toUpperCase(),
    },
    mainCondition: textOrNull(values.mainCondition),
    secondaryConditions: values.secondaryConditions
      .map((item) => item.trim())
      .filter(Boolean),
    healthPlan: textOrNull(values.healthPlan),
    notes: textOrNull(values.notes),
  };
}

/** Valores do formulário de edição a partir do paciente da API. */
export function patientToValues(patient) {
  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [field, patient.address[field] ?? '']),
  );
  return {
    ...emptyPatientValues(),
    ...address,
    name: patient.name,
    birthDate: patient.birthDate,
    sex: patient.sex ?? '',
    cpf: maskCpf(patient.cpf ?? ''),
    phone: maskPhone(patient.phone ?? ''),
    email: patient.email ?? '',
    zipCode: maskZipCode(address.zipCode),
    mainCondition: patient.mainCondition ?? '',
    secondaryConditions: [...patient.secondaryConditions],
    healthPlan: patient.healthPlan ?? '',
    notes: patient.notes ?? '',
    responsibleUserId: patient.responsible?.id ?? '',
  };
}

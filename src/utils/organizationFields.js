// Regras do corpo de PATCH /organizations/me, iguais às do DTO da API
// (`updateOrganization.dto.ts`, conferido em 12/11/2026), que a rota da
// plataforma também usa. Campo ausente não muda; nulo limpa os opcionais.
import { isValidCpf } from './cpf.js';
import { emailError, nameError, phoneError } from './userFields.js';

export const ORGANIZATION_LIMITS = Object.freeze({
  tradeName: 180,
  legalName: 180,
  document: 32,
  phone: 32,
  email: 254,
});

const DOCUMENT_PATTERN = /^(?=.*[0-9A-Za-z])[0-9A-Za-z./ -]+$/;
const PHONE_PATTERN = /^[0-9+() -]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EDITABLE = Object.keys(ORGANIZATION_LIMITS);

function lengthError(text, field) {
  if (text.length === 0) {
    return 'MIN_LENGTH';
  }
  return text.length > ORGANIZATION_LIMITS[field] ? 'MAX_LENGTH' : null;
}

function fieldError(field, value) {
  if (typeof value !== 'string') {
    return 'IS_STRING';
  }
  const text = value.trim();
  if (field === 'document' && !DOCUMENT_PATTERN.test(text)) {
    return 'MATCHES';
  }
  if (field === 'phone' && !PHONE_PATTERN.test(text)) {
    return 'MATCHES';
  }
  if (field === 'email' && !EMAIL_PATTERN.test(text)) {
    return 'IS_EMAIL';
  }
  return lengthError(text, field);
}

/** Erros do corpo, em `[{ field, code }]`; vazio quando tudo confere. */
export function organizationErrors(body) {
  const errors = [];
  for (const [field, value] of Object.entries(body)) {
    if (!EDITABLE.includes(field)) {
      errors.push({ field, code: 'WHITELIST_VALIDATION' });
    } else if (
      value === undefined ||
      (value === null && field !== 'tradeName')
    ) {
      continue;
    } else {
      const code = fieldError(field, value);
      if (code) {
        errors.push({ field, code });
      }
    }
  }
  return errors;
}

// Corpo de POST /organizations (`createOrganization.dto.ts`, conferido em
// 16/11/2026): organização, plano e primeiro administrador numa operação só.
// O código é público, imutável e usado no login, por isso segue a mesma
// regra do campo do login.
const ORGANIZATION_CODE = Object.freeze({ min: 3, max: 50 });
const CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NEW_FIELDS = [...EDITABLE, 'code', 'usagePlanId', 'administrator'];
const ADMINISTRATOR_FIELDS = ['name', 'email', 'cpf', 'phone'];

function codeError(value) {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (code.length < ORGANIZATION_CODE.min) {
    return code === '' || CODE_PATTERN.test(code) ? 'MIN_LENGTH' : 'MATCHES';
  }
  if (!CODE_PATTERN.test(code)) {
    return 'MATCHES';
  }
  return code.length > ORGANIZATION_CODE.max ? 'MAX_LENGTH' : null;
}

function administratorErrors(administrator) {
  if (!administrator || typeof administrator !== 'object') {
    return [{ field: 'administrator', code: 'NESTED_VALIDATION' }];
  }
  const checks = [
    ['name', nameError(administrator.name)],
    ['email', emailError(administrator.email)],
    ['cpf', isValidCpf(administrator.cpf) ? null : 'IS_CPF'],
    [
      'phone',
      administrator.phone === undefined || administrator.phone === null
        ? null
        : phoneError(administrator.phone),
    ],
    ...Object.keys(administrator)
      .filter((field) => !ADMINISTRATOR_FIELDS.includes(field))
      .map((field) => [field, 'WHITELIST_VALIDATION']),
  ];
  return checks
    .filter(([, code]) => code)
    .map(([field, code]) => ({ field: `administrator.${field}`, code }));
}

/**
 * Erros do corpo do cadastro, em `[{ field, code }]`, com os campos do
 * administrador no caminho aninhado (`administrator.cpf`), como a API
 * aponta. Os opcionais da organização seguem a regra da edição.
 */
export function newOrganizationErrors(body) {
  const { code, tradeName, usagePlanId, administrator, ...rest } = body;
  const errors = [];
  const add = (field, error) => {
    if (error) {
      errors.push({ field, code: error });
    }
  };
  add('code', codeError(code));
  add('tradeName', fieldError('tradeName', tradeName ?? null));
  for (const field of ['legalName', 'document', 'phone', 'email']) {
    if (rest[field] !== undefined && rest[field] !== null) {
      add(field, fieldError(field, rest[field]));
    }
  }
  add(
    'usagePlanId',
    typeof usagePlanId === 'string' && UUID_PATTERN.test(usagePlanId)
      ? null
      : 'IS_UUID',
  );
  errors.push(...administratorErrors(administrator));
  for (const field of Object.keys(body)) {
    if (!NEW_FIELDS.includes(field)) {
      errors.push({ field, code: 'WHITELIST_VALIDATION' });
    }
  }
  return errors;
}

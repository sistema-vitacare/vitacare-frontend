// Regras do corpo de PATCH /organizations/me, iguais às do DTO da API
// (`updateOrganization.dto.ts`, conferido em 12/11/2026), que a rota da
// plataforma também usa. Campo ausente não muda; nulo limpa os opcionais.

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

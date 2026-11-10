// Regras dos campos de acesso, iguais às dos DTOs das rotas `auth` da API
// (login, primeiro acesso, recuperação e redefinição). Conferir antes do envio
// só evita a ida à API; quem decide continua sendo a API.

export const FIELD_ERRORS = Object.freeze({
  REQUIRED: 'required',
  INVALID: 'invalid',
  TOO_SHORT: 'tooShort',
  TOO_LONG: 'tooLong',
  MISMATCH: 'mismatch',
});

const E = FIELD_ERRORS;

export const ORGANIZATION_CODE_LENGTH = Object.freeze({ min: 3, max: 50 });
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_LENGTH = Object.freeze({ min: 8, max: 128 });

const ORGANIZATION_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A API normaliza código e e-mail para minúsculas; o espaço nas pontas sai
// aqui para que um espaço colado junto com o texto não vire erro de formato.
export function normalizeOrganizationCode(value) {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function lengthError(length, { min, max }) {
  if (length < min) {
    return E.TOO_SHORT;
  }
  return length > max ? E.TOO_LONG : null;
}

export function validateOrganizationCode(value) {
  const code = normalizeOrganizationCode(value);
  if (code === '') {
    return E.REQUIRED;
  }
  return (
    lengthError(code.length, ORGANIZATION_CODE_LENGTH) ??
    (ORGANIZATION_CODE_PATTERN.test(code) ? null : E.INVALID)
  );
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email === '') {
    return E.REQUIRED;
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return E.TOO_LONG;
  }
  return EMAIL_PATTERN.test(email) ? null : E.INVALID;
}

// A senha nunca é aparada nem normalizada, como na API. O tamanho conta
// caracteres, e não unidades UTF-16: um emoji conta como um.
export function validatePassword(value) {
  if (value === '') {
    return E.REQUIRED;
  }
  return lengthError(Array.from(value).length, PASSWORD_LENGTH);
}

export function validateConfirmation(password, confirmation) {
  if (confirmation === '') {
    return E.REQUIRED;
  }
  return confirmation === password ? null : E.MISMATCH;
}

// O 422 da API aponta o campo com códigos próprios (`MATCHES`, `IS_EMAIL`);
// como as regras daqui são as mesmas, qualquer apontamento vira formato
// inválido, com a mensagem da tela, e nunca o texto da API.
export function fieldErrorsFromApi(error) {
  return Object.fromEntries(
    (error.fields ?? []).map(({ field }) => [field, E.INVALID]),
  );
}

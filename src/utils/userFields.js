// Regras do corpo de POST e PATCH /users, iguais às dos DTOs da API
// (`createUser.dto.ts` e `updateUser.dto.ts`, conferidos em 13/11/2026). A
// tela confere antes do envio para apontar o campo; quem decide é a API.
import { INVITATION_CHANNELS, TENANT_PROFILES } from '../constants/users.js';
import { isValidCpf } from './cpf.js';
import { digitsOnly } from './masks.js';

export const USER_LIMITS = Object.freeze({ name: 180, email: 254, phone: 32 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+() -]+$/;

const CREATE_FIELDS = [
  'name',
  'email',
  'cpf',
  'phone',
  'profileCode',
  'channel',
];
// O perfil e a situação mudam por rotas próprias.
const UPDATE_FIELDS = ['name', 'email', 'cpf', 'phone'];

const text = (value) => (typeof value === 'string' ? value.trim() : null);

function nameError(value) {
  const name = text(value);
  if (!name) {
    return 'MIN_LENGTH';
  }
  return name.length > USER_LIMITS.name ? 'MAX_LENGTH' : null;
}

function emailError(value) {
  const email = text(value);
  if (!email || !EMAIL_PATTERN.test(email)) {
    return 'IS_EMAIL';
  }
  return email.length > USER_LIMITS.email ? 'MAX_LENGTH' : null;
}

function phoneError(value) {
  const phone = text(value);
  if (phone === null || !PHONE_PATTERN.test(phone)) {
    return 'MATCHES';
  }
  return phone.length > USER_LIMITS.phone ? 'MAX_LENGTH' : null;
}

/**
 * Erros do corpo, em `[{ field, code }]`. Na edição (`partial`), campo
 * ausente não muda e só o telefone aceita nulo, que o limpa.
 */
export function userErrors(body, { partial = false } = {}) {
  const errors = [];
  const add = (field, code) => {
    if (code) {
      errors.push({ field, code });
    }
  };
  const check = (field) => !partial || body[field] !== undefined;

  if (check('name')) {
    add('name', nameError(body.name));
  }
  if (check('email')) {
    add('email', emailError(body.email));
  }
  if (check('cpf')) {
    add('cpf', isValidCpf(body.cpf) ? null : 'IS_CPF');
  }
  if (body.phone !== undefined && body.phone !== null) {
    add('phone', phoneError(body.phone));
  }
  if (!partial) {
    add(
      'profileCode',
      TENANT_PROFILES.includes(body.profileCode) ? null : 'IS_IN',
    );
    if (body.channel !== undefined) {
      add(
        'channel',
        INVITATION_CHANNELS.includes(body.channel) ? null : 'IS_IN',
      );
    }
  }
  const known = partial ? UPDATE_FIELDS : CREATE_FIELDS;
  for (const field of Object.keys(body)) {
    if (!known.includes(field)) {
      errors.push({ field, code: 'WHITELIST_VALIDATION' });
    }
  }
  return errors;
}

/** Corpo como a API grava: textos aparados, e-mail em minúsculas e CPF só com dígitos. */
export function normalizeUserBody(body) {
  const normalized = { ...body };
  if (typeof body.name === 'string') {
    normalized.name = body.name.trim();
  }
  if (typeof body.email === 'string') {
    normalized.email = body.email.trim().toLowerCase();
  }
  if (typeof body.cpf === 'string') {
    normalized.cpf = digitsOnly(body.cpf);
  }
  if (typeof body.phone === 'string') {
    normalized.phone = body.phone.trim();
  }
  return normalized;
}

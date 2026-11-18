// Regras do termo de vigência que a plataforma abre ao atribuir um plano ou
// aprovar uma solicitação, iguais às da API (`planTermFields.dto.ts` e
// `planTerm.policy.ts`, conferidos em 16/11/2026). Campo ausente ou nulo
// volta ao padrão: sem vencimento e limites do catálogo.
import { SAO_PAULO_OFFSET } from './format.js';

export const PLAN_LIMIT_MAX = 100000;
export const PLAN_NOTE_MAX = 500;

const LIMIT_FIELDS = ['userLimit', 'patientLimit'];

// ISO 8601 com data e hora e com fuso, como o `IsISO8601({ strict: true })`
// da API aceita para um instante.
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function limitError(value) {
  if (!Number.isInteger(value)) {
    return 'IS_INT';
  }
  if (value < 0) {
    return 'MIN';
  }
  return value > PLAN_LIMIT_MAX ? 'MAX' : null;
}

/** Texto opcional de 1 a 500 caracteres, aparado; `null` quando confere. */
function noteError(value) {
  if (typeof value !== 'string') {
    return 'IS_STRING';
  }
  const text = value.trim();
  if (text.length === 0) {
    return 'MIN_LENGTH';
  }
  return text.length > PLAN_NOTE_MAX ? 'MAX_LENGTH' : null;
}

/**
 * Erros de formato do corpo, em `[{ field, code }]`, como o 422
 * `VALIDATION_FAILED` da API. `noteField` é `reason` na atribuição e
 * `decisionNote` na aprovação.
 */
export function planTermFieldErrors(body, { noteField = 'reason' } = {}) {
  const errors = [];
  const present = (field) => body[field] !== undefined && body[field] !== null;
  if (
    present('endsAt') &&
    !(ISO_INSTANT.test(body.endsAt) && !Number.isNaN(Date.parse(body.endsAt)))
  ) {
    errors.push({ field: 'endsAt', code: 'IS_ISO8601' });
  }
  for (const field of LIMIT_FIELDS) {
    const code = present(field) ? limitError(body[field]) : null;
    if (code) {
      errors.push({ field, code });
    }
  }
  const code = present(noteField) ? noteError(body[noteField]) : null;
  if (code) {
    errors.push({ field: noteField, code });
  }
  return errors;
}

/**
 * A primeira regra do termo que o corpo quebra, na ordem da API: a data de
 * fim no futuro e, depois, o limite personalizado só no plano expansível e
 * nunca abaixo do catálogo, usuários antes de pacientes. `null` quando
 * confere.
 */
export function planTermRuleError(body, { plan, now = new Date() }) {
  if (body.endsAt && Date.parse(body.endsAt) <= now.getTime()) {
    return { field: 'endsAt', code: 'IN_PAST' };
  }
  for (const field of LIMIT_FIELDS) {
    const custom = body[field];
    if (custom === undefined || custom === null) {
      continue;
    }
    if (!plan.expandable) {
      return { field, code: 'NOT_EXPANDABLE' };
    }
    if (custom < plan[field]) {
      return { field, code: 'BELOW_CATALOG' };
    }
  }
  return null;
}

/** Justificativa obrigatória da recusa; o código do erro ou `null`. */
export function decisionNoteError(value) {
  return noteError(value ?? '');
}

/**
 * Fim da vigência escolhido como dia: vale até 23:59 desse dia em Brasília,
 * o mesmo dia que a mensagem de vencimento da API mostra.
 */
export function endOfDayInSaoPaulo(date) {
  return new Date(`${date}T23:59:59.999${SAO_PAULO_OFFSET}`).toISOString();
}

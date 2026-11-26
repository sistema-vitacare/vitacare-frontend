// Regras de alerta por valor registrado, como a API: o corpo da regra
// (`alertRuleFields.ts`, 422 VALIDATION_FAILED), que o diálogo confere antes
// do envio. A avaliação dos registros e a geração dos alertas são da API.
import { ALERT_RULE_OPERATORS, ALERT_SEVERITIES } from '../constants/alerts.js';

export const ALERT_RULE_LIMITS = Object.freeze({
  name: 120,
  description: 500,
  // Teto de `numeric(12,3)` da coluna da API.
  maxReference: 999_999_999.999,
  referenceDecimalPlaces: 3,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_FIELDS = [
  'formId',
  'fieldKey',
  'patientId',
  'name',
  'description',
  'operator',
  'referenceValue',
  'severity',
];
const UPDATE_FIELDS = [
  'name',
  'description',
  'operator',
  'referenceValue',
  'severity',
];

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

function referenceError(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'IS_NUMBER';
  }
  // Notação exponencial (`1e-7`) conta como casas demais, como na API.
  const text = String(value);
  if (
    text.includes('e') ||
    (text.split('.')[1] ?? '').length > ALERT_RULE_LIMITS.referenceDecimalPlaces
  ) {
    return 'HAS_MAX_DECIMALS';
  }
  if (value < -ALERT_RULE_LIMITS.maxReference) {
    return 'MIN';
  }
  return value > ALERT_RULE_LIMITS.maxReference ? 'MAX' : null;
}

/**
 * Erros do corpo da regra, em `[{ field, code }]`. Na edição (`partial`),
 * só nome, descrição, operador, referência e severidade; nulo só limpa a
 * descrição.
 */
export function alertRuleErrors(body, { partial = false } = {}) {
  const errors = [];
  const add = (field, code) => {
    if (code) {
      errors.push({ field, code });
    }
  };
  const check = (field) =>
    !partial || (field in body && body[field] !== undefined);

  if (!partial) {
    add('formId', UUID.test(body.formId ?? '') ? null : 'IS_UUID');
    add('fieldKey', UUID.test(body.fieldKey ?? '') ? null : 'IS_UUID');
    if (body.patientId !== null && body.patientId !== undefined) {
      add('patientId', UUID.test(body.patientId) ? null : 'IS_UUID');
    }
  }
  if (check('name')) {
    add('name', textError(body.name, ALERT_RULE_LIMITS.name));
  }
  if (body.description !== null && body.description !== undefined) {
    add(
      'description',
      textError(body.description, ALERT_RULE_LIMITS.description),
    );
  }
  if (check('operator')) {
    add(
      'operator',
      ALERT_RULE_OPERATORS.includes(body.operator) ? null : 'IS_IN',
    );
  }
  if (check('referenceValue')) {
    add('referenceValue', referenceError(body.referenceValue));
  }
  if (check('severity')) {
    add('severity', ALERT_SEVERITIES.includes(body.severity) ? null : 'IS_IN');
  }
  const known = partial ? UPDATE_FIELDS : CREATE_FIELDS;
  for (const field of Object.keys(body)) {
    if (!known.includes(field)) {
      errors.push({ field, code: 'WHITELIST_VALIDATION' });
    }
  }
  return errors;
}

// Regras de alerta por valor registrado, como a API: o corpo da regra
// (`alertRuleFields.ts`, 422 VALIDATION_FAILED) e a avaliação de um
// registro logo depois do envio (`alert.repository.ts`). Valem as regras
// ativas do formulário respondido criadas até o envio, e a regra ativa do
// paciente num campo substitui as gerais desse campo para ele.
import {
  ALERT_RULE_FIELD_TYPES,
  ALERT_RULE_OPERATORS,
  ALERT_SEVERITIES,
} from '../constants/alerts.js';
import { readingMessage } from './alertMessages.js';

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

const COMPARE = {
  gt: (value, reference) => value > reference,
  gte: (value, reference) => value >= reference,
  lt: (value, reference) => value < reference,
  lte: (value, reference) => value <= reference,
};

/** O valor registrado satisfaz a regra? */
export function matchesOperator(operator, value, reference) {
  return COMPARE[operator](value, reference);
}

function validAt(rule, followUp) {
  return (
    rule.status === 'active' &&
    rule.form.id === followUp.form.id &&
    rule.createdAt <= followUp.submittedAt
  );
}

/**
 * Regras que avaliam o registro, na ordem da API: posição do campo no
 * registro, depois a criação da regra.
 */
export function rulesForFollowUp(rules, followUp) {
  const candidates = rules.filter((rule) => validAt(rule, followUp));
  const ownFields = new Set(
    candidates
      .filter((rule) => rule.patient?.id === followUp.patientId)
      .map((rule) => rule.field.key),
  );
  const position = new Map(
    followUp.answers.map((answer, index) => [answer.fieldKey, index]),
  );
  return candidates
    .filter((rule) =>
      rule.patient
        ? rule.patient.id === followUp.patientId
        : !ownFields.has(rule.field.key),
    )
    .sort(
      (a, b) =>
        (position.get(a.field.key) ?? Infinity) -
          (position.get(b.field.key) ?? Infinity) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}

/**
 * Alertas que o registro gera, no formato de GET /alerts, com a cópia do
 * campo, do valor e da regra no disparo. `idFor(rule, index)` dá o id.
 */
export function readingAlerts(
  followUp,
  rules,
  { patient, generatedAt, idFor },
) {
  const answers = new Map(
    followUp.answers
      .filter((answer) => ALERT_RULE_FIELD_TYPES.includes(answer.fieldType))
      .map((answer) => [answer.fieldKey, answer]),
  );
  return rulesForFollowUp(rules, followUp)
    .filter((rule) => {
      const answer = answers.get(rule.field.key);
      return (
        typeof answer?.value === 'number' &&
        matchesOperator(rule.operator, answer.value, rule.referenceValue)
      );
    })
    .map((rule, index) => {
      const answer = answers.get(rule.field.key);
      const value = String(answer.value);
      return {
        id: idFor(rule, index),
        patient: { id: patient.id, name: patient.name },
        source: 'reading',
        severity: rule.severity,
        status: 'open',
        title: rule.name,
        message: readingMessage({
          fieldName: answer.name,
          unit: answer.unit,
          value,
          operator: rule.operator,
          referenceValue: rule.referenceValue,
        }),
        rule: { id: rule.id, name: rule.name },
        followUp: {
          id: followUp.id,
          visitedAt: followUp.visitedAt,
          status: followUp.status,
        },
        field: { key: answer.fieldKey, name: answer.name, unit: answer.unit },
        value,
        operator: rule.operator,
        referenceValue: rule.referenceValue,
        absence: null,
        medicationReminder: null,
        generatedAt,
        resolution: null,
        notification: null,
      };
    });
}

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

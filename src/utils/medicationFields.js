// Regras do corpo do cadastro (POST /medications) e da edição (PATCH
// /medications/{id}), as mesmas de `medicationFields.ts` do backend (422
// VALIDATION_FAILED). Um código por campo, o primeiro da ordem da API. A
// tela confere antes de enviar e o serviço simulado recusa do mesmo jeito.
// Fim anterior ao início gravado e edição sem mudança são do serviço,
// porque dependem do medicamento gravado.
import {
  DOSE_UNITS,
  MEDICATION_LIMITS as LIMITS,
  MEDICATION_ROUTES,
} from '../constants/medications.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const CREATE_FIELDS = [
  'patientId',
  'name',
  'doseAmount',
  'doseUnit',
  'route',
  'notes',
  'startDate',
  'endDate',
  'intervalDays',
  'times',
  'remindersEnabled',
];
const UPDATE_FIELDS = CREATE_FIELDS.filter((field) => field !== 'patientId');

const isPresent = (value) => value !== null && value !== undefined;

/** Data civil `AAAA-MM-DD` que existe no calendário (sem 30/02). */
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
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

function decimalPlaces(value) {
  return String(value).split('.')[1]?.length ?? 0;
}

function doseError(value) {
  // Notação exponencial (`1e-7`) não é aceita como número de até 3 casas.
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    String(value).includes('e') ||
    decimalPlaces(value) > LIMITS.doseDecimalPlaces
  ) {
    return 'IS_NUMBER';
  }
  if (value <= 0) {
    return 'IS_POSITIVE';
  }
  return value > LIMITS.maxDoseAmount ? 'MAX' : null;
}

function startDateError(value, today) {
  return isCalendarDate(value) &&
    value >= LIMITS.minStartDate &&
    value <= addDays(today, LIMITS.maxStartDaysAhead)
    ? null
    : 'IS_MEDICATION_START_DATE';
}

/**
 * Fim até 2100-12-31 e não antes do início do mesmo corpo; no cadastro sem
 * início, não antes de hoje, que é o início que a API grava.
 */
function endDateError(body, { today, partial }) {
  const value = body.endDate;
  if (!isCalendarDate(value) || value > LIMITS.maxEndDate) {
    return 'IS_MEDICATION_END_DATE';
  }
  let start = null;
  if (isCalendarDate(body.startDate)) {
    start = body.startDate;
  } else if (!partial && !isPresent(body.startDate)) {
    start = today;
  }
  return start === null || value >= start ? null : 'IS_MEDICATION_END_DATE';
}

function intervalError(value) {
  if (!Number.isInteger(value)) {
    return 'IS_INT';
  }
  if (value < 1) {
    return 'MIN';
  }
  return value > LIMITS.maxIntervalDays ? 'MAX' : null;
}

function timesError(value) {
  if (!Array.isArray(value)) {
    return 'IS_ARRAY';
  }
  if (value.length < 1) {
    return 'ARRAY_MIN_SIZE';
  }
  if (value.length > LIMITS.maxTimes) {
    return 'ARRAY_MAX_SIZE';
  }
  // A API apara cada horário antes de conferir repetição e formato.
  const times = value.map((time) =>
    typeof time === 'string' ? time.trim() : time,
  );
  if (new Set(times).size !== times.length) {
    return 'ARRAY_UNIQUE';
  }
  return times.every(
    (time) => typeof time === 'string' && TIME_PATTERN.test(time),
  )
    ? null
    : 'MATCHES';
}

/**
 * Erros do corpo, em `[{ field, code }]`. Na edição (`partial`), campo
 * ausente não muda; nulo só limpa via, observação e fim. No cadastro, o
 * nulo nos opcionais vale o padrão da API.
 */
export function medicationErrors(body, { today, partial = false }) {
  const errors = [];
  const add = (field, code) => {
    if (code) {
      errors.push({ field, code });
    }
  };
  const sent = (field) => field in body && body[field] !== undefined;
  // No cadastro, o opcional nulo vale o padrão; na edição, só via,
  // observação e fim aceitam nulo.
  const check = (field, required) =>
    partial ? sent(field) : required || isPresent(body[field]);

  if (!partial) {
    add('patientId', UUID.test(body.patientId ?? '') ? null : 'IS_UUID');
  }
  if (check('name', true)) {
    add('name', textError(body.name, LIMITS.name));
  }
  if (check('doseAmount', true)) {
    add('doseAmount', doseError(body.doseAmount));
  }
  if (check('doseUnit', true)) {
    add('doseUnit', DOSE_UNITS.includes(body.doseUnit) ? null : 'IS_IN');
  }
  if (isPresent(body.route)) {
    add('route', MEDICATION_ROUTES.includes(body.route) ? null : 'IS_IN');
  }
  if (isPresent(body.notes)) {
    add('notes', textError(body.notes, LIMITS.notes));
  }
  if (check('startDate', false)) {
    add('startDate', startDateError(body.startDate, today));
  }
  if (isPresent(body.endDate)) {
    add('endDate', endDateError(body, { today, partial }));
  }
  if (check('intervalDays', false)) {
    add('intervalDays', intervalError(body.intervalDays));
  }
  if (check('times', true)) {
    add('times', timesError(body.times));
  }
  if (check('remindersEnabled', false)) {
    add(
      'remindersEnabled',
      typeof body.remindersEnabled === 'boolean' ? null : 'IS_BOOLEAN',
    );
  }
  const known = partial ? UPDATE_FIELDS : CREATE_FIELDS;
  for (const field of Object.keys(body)) {
    if (!known.includes(field)) {
      errors.push({ field, code: 'WHITELIST_VALIDATION' });
    }
  }
  return errors;
}

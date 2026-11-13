// Período de dias civis de Brasília, com a regra que a API aplica à
// evolução, ao relatório, ao painel e à auditoria (`evolutionPeriod.policy.ts`
// e `dashboardPeriod.policy.ts` do backend, conferidos em 12/11/2026).
import { isCalendarDate } from './medicationFields.js';

export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

const toDay = (date) => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;
const fromDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

export function shiftDays(date, days) {
  return fromDay(toDay(date) + days);
}

/**
 * Período de `query` (`from` e `to`, em `AAAA-MM-DD`): sem datas, os últimos
 * 30 dias até `today`; só o início termina hoje; só o fim começa 29 dias
 * antes. `errors` traz os campos recusados, com os códigos da API.
 */
export function resolvePeriod({ from, to } = {}, today) {
  const errors = [];
  if (from && !isCalendarDate(from)) {
    errors.push({ field: 'from', code: 'IS_CALENDAR_DATE' });
  }
  // O DTO da API recusa o fim anterior ao início no próprio campo do fim.
  if (to && (!isCalendarDate(to) || (from && to < from))) {
    errors.push({ field: 'to', code: 'IS_CALENDAR_DATE' });
  }
  if (errors.length > 0) {
    return { period: null, errors };
  }
  const end = to || today;
  const start = from || shiftDays(end, 1 - DEFAULT_PERIOD_DAYS);
  if (start > end) {
    return { period: null, errors: [{ field: 'from', code: 'AFTER_END' }] };
  }
  if (toDay(end) - toDay(start) + 1 > MAX_PERIOD_DAYS) {
    return {
      period: null,
      errors: [{ field: 'to', code: 'PERIOD_TOO_LONG' }],
    };
  }
  return { period: { from: start, to: end }, errors };
}

/** Os mesmos dias imediatamente antes do início, para a variação. */
export function previousPeriod({ from, to }) {
  const length = toDay(to) - toDay(from) + 1;
  return {
    from: fromDay(toDay(from) - length),
    to: fromDay(toDay(from) - 1),
  };
}

export function periodDays({ from, to }) {
  const days = [];
  for (let day = toDay(from); day <= toDay(to); day += 1) {
    days.push(fromDay(day));
  }
  return days;
}

// Dias de cada atalho do painel; "Hoje" é o "Registros hoje" da Figura 33.
const SHORTCUT_DAYS = { today: 1, 7: 7, 30: 30, 90: 90 };

/** Datas de um atalho do painel, terminando em `today`. */
export function shortcutPeriod(shortcut, today) {
  const days = SHORTCUT_DAYS[shortcut] ?? DEFAULT_PERIOD_DAYS;
  return { from: shiftDays(today, 1 - days), to: today };
}

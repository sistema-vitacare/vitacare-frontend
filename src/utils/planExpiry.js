// Aviso de vencimento da vigência do plano, com a regra e o texto de
// `planExpiry.policy.ts` do backend (BE-28, conferido em 12/11/2026): sete
// dias e um dia antes da data de fim, sempre às 08:00 de Brasília, e
// vencido desde o fim.
import {
  formatMessageDateTime,
  SAO_PAULO_OFFSET,
  todayInSaoPaulo,
} from './format.js';
import { shiftDays } from './period.js';

const NOTICE_TIME = '08:00';

const noticeAt = (date) =>
  Date.parse(`${date}T${NOTICE_TIME}:00${SAO_PAULO_OFFSET}`);

/** `within_7_days`, `within_1_day`, `expired` ou `null` no instante `now`. */
export function planExpiryWarning(endsAt, now = new Date()) {
  if (!endsAt) {
    return null;
  }
  const time = now.getTime();
  const end = Date.parse(endsAt);
  if (time >= end) {
    return 'expired';
  }
  const endDate = todayInSaoPaulo(new Date(end));
  if (time >= noticeAt(shiftDays(endDate, -1))) {
    return 'within_1_day';
  }
  return time >= noticeAt(shiftDays(endDate, -7)) ? 'within_7_days' : null;
}

/** `meta.message` da consulta do plano quando há aviso; `null` sem aviso. */
export function planExpiryMessage(warning, endsAt) {
  if (!warning || !endsAt) {
    return null;
  }
  const when = `${formatMessageDateTime(endsAt)} (horário de Brasília)`;
  return warning === 'expired'
    ? `O plano venceu em ${when}. Novos cadastros e reativações de usuários e pacientes estão bloqueados até a renovação; a consulta e os registros continuam. Solicite a renovação na área de plano.`
    : `O plano vence em ${when}. Depois disso, novos cadastros e reativações de usuários e pacientes ficam bloqueados até a renovação. Solicite a renovação na área de plano.`;
}

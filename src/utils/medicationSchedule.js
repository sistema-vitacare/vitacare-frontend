// Dias desde o início da agenda de um medicamento, pelo dia de Brasília,
// como em `medicationSchedule.policy.ts` do backend. O próximo horário, a
// coincidência e os lembretes vêm da API.
import { todayInSaoPaulo } from './format.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `AAAA-MM-DD` em dias desde 1970-01-01, sem fuso. */
const toDay = (date) => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;

/** Dias desde o início até hoje em Brasília; negativo se o início é futuro. */
export function daysSinceStart(startDate, now = new Date()) {
  return toDay(todayInSaoPaulo(now)) - toDay(startDate);
}

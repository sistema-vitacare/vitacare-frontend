// Agenda de um medicamento, com as regras de `medicationSchedule.policy.ts`
// do backend: os horários `HH:mm` de Brasília se repetem a cada
// `intervalDays` dias contados do início, até o fim opcional. O próximo
// horário e a coincidência vêm da API; aqui ficam os dias desde o início, do
// cartão, e os lembretes dos alertas simulados.
import { SAO_PAULO_OFFSET, todayInSaoPaulo } from './format.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `AAAA-MM-DD` em dias desde 1970-01-01, sem fuso. */
const toDay = (date) => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;

const fromDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

/** Data e hora de Brasília para o instante em UTC. */
function localInstant(date, time) {
  return new Date(`${date}T${time}:00${SAO_PAULO_OFFSET}`);
}

/** Primeiro dia de dose em `day` ou depois, ou `null` se passou do fim. */
function firstDoseDayFrom(schedule, day) {
  const start = toDay(schedule.startDate);
  const from = Math.max(start, day);
  const aligned =
    from +
    mod(
      schedule.intervalDays - mod(from - start, schedule.intervalDays),
      schedule.intervalDays,
    );
  return schedule.endDate !== null && aligned > toDay(schedule.endDate)
    ? null
    : aligned;
}

/** Horários depois de `from` e até `to`, do mais antigo ao mais novo. */
export function occurrencesBetween(schedule, from, to) {
  const times = [...schedule.times].sort();
  const last = toDay(todayInSaoPaulo(to));
  const occurrences = [];
  let day = firstDoseDayFrom(schedule, toDay(todayInSaoPaulo(from)));
  while (day !== null && day <= last) {
    for (const time of times) {
      const instant = localInstant(fromDay(day), time);
      if (instant > from && instant <= to) {
        occurrences.push(instant);
      }
    }
    day = firstDoseDayFrom(schedule, day + 1);
  }
  return occurrences;
}

/** Dias desde o início até hoje em Brasília; negativo se o início é futuro. */
export function daysSinceStart(startDate, now = new Date()) {
  return toDay(todayInSaoPaulo(now)) - toDay(startDate);
}

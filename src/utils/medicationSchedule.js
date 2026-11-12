// Agenda de um medicamento, com as regras de `medicationSchedule.policy.ts`
// do backend: os horários `HH:mm` de Brasília se repetem a cada
// `intervalDays` dias contados do início, até o fim opcional. O serviço
// simulado calcula com elas o próximo horário, a coincidência com outro
// medicamento e os lembretes, como a API.
import { SAO_PAULO_OFFSET, todayInSaoPaulo } from './format.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `AAAA-MM-DD` em dias desde 1970-01-01, sem fuso. */
const toDay = (date) => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;

const fromDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

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

/** Próximo horário estritamente depois de `now`, ou `null` se a agenda acabou. */
export function nextOccurrence(schedule, now) {
  const times = [...schedule.times].sort();
  // Sem horário, o laço nunca acharia um e não terminaria.
  if (times.length === 0) {
    return null;
  }
  let day = firstDoseDayFrom(schedule, toDay(todayInSaoPaulo(now)));
  while (day !== null) {
    for (const time of times) {
      const instant = localInstant(fromDay(day), time);
      if (instant > now) {
        return instant;
      }
    }
    day = firstDoseDayFrom(schedule, day + 1);
  }
  return null;
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

/** As duas agendas têm dose num mesmo dia, de `today` em diante? */
function shareDoseDay(a, b, today) {
  const startA = toDay(a.startDate);
  const startB = toDay(b.startDate);
  const step = gcd(a.intervalDays, b.intervalDays);
  if (mod(startB - startA, step) !== 0) {
    return false;
  }
  const ends = [a.endDate, b.endDate].filter(Boolean).map(toDay);
  const last = ends.length ? Math.min(...ends) : Number.POSITIVE_INFINITY;
  const from = Math.max(startA, startB, toDay(today));
  // As doses das duas se repetem juntas a cada mínimo múltiplo comum.
  const period = (a.intervalDays * b.intervalDays) / step;
  for (let day = from; day <= Math.min(last, from + period - 1); day += 1) {
    if (
      mod(day - startA, a.intervalDays) === 0 &&
      mod(day - startB, b.intervalDays) === 0
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Horários de `target` iguais aos de outro medicamento num dia em que os
 * dois têm dose, de hoje em diante. É aviso, nunca bloqueio; quem chama
 * passa só os outros medicamentos ativos do paciente.
 */
export function findScheduleConflicts(target, others, today) {
  const targetTimes = new Set(target.times);
  return others
    .filter((item) => shareDoseDay(target, item.schedule, today))
    .flatMap((item) =>
      item.schedule.times
        .filter((time) => targetTimes.has(time))
        .map((time) => ({
          medicationId: item.id,
          medicationName: item.name,
          time,
        })),
    )
    .sort(
      (x, y) =>
        x.time.localeCompare(y.time) ||
        x.medicationName.localeCompare(y.medicationName, 'pt-BR') ||
        x.medicationId.localeCompare(y.medicationId),
    );
}

/** Dias desde o início até hoje em Brasília; negativo se o início é futuro. */
export function daysSinceStart(startDate, now = new Date()) {
  return toDay(todayInSaoPaulo(now)) - toDay(startDate);
}

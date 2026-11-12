// Mensagens que a API grava nos alertas, sem interpretação clínica: as de
// `alertMessage.policy.ts` (valor registrado) e de
// `scheduledAlertMessage.policy.ts` (ausência e lembrete) do backend. Só o
// serviço simulado as usa; a tela mostra a mensagem como a API devolve.
import { formatDateTime } from './format.js';

const OPERATOR_TEXT = {
  gt: 'maior que',
  gte: 'maior ou igual a',
  lt: 'menor que',
  lte: 'menor ou igual a',
};

const FREQUENCY_TEXT = {
  hours: ['hora', 'horas'],
  days: ['dia', 'dias'],
  weeks: ['semana', 'semanas'],
};

const DOSE_TEXT = {
  mg: ['mg', 'mg'],
  mcg: ['mcg', 'mcg'],
  g: ['g', 'g'],
  ml: ['mL', 'mL'],
  iu: ['UI', 'UI'],
  drops: ['gota', 'gotas'],
  tablet: ['comprimido', 'comprimidos'],
  capsule: ['cápsula', 'cápsulas'],
  application: ['aplicação', 'aplicações'],
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const withUnit = (value, unit) => (unit ? `${value} ${unit}` : `${value}`);

const plural = ([one, many], amount) => (amount > 1 ? many : one);

/** `Pressão sistólica: 172 mmHg (maior que 160 mmHg).` */
export function readingMessage({
  fieldName,
  unit,
  value,
  operator,
  referenceValue,
}) {
  return `${fieldName}: ${withUnit(value, unit)} (${OPERATOR_TEXT[operator]} ${withUnit(referenceValue, unit)}).`;
}

/** `Sem registro de Sinais vitais desde 02/11/2026 09:30; esperado a cada 1 semana.` */
export function absenceMessage({ formName, since, frequency }) {
  return `Sem registro de ${formName} desde ${formatDateTime(since)}; esperado a cada ${frequency.interval} ${plural(FREQUENCY_TEXT[frequency.unit], frequency.interval)}.`;
}

/**
 * `Losartana potássica 50 mg 1 comprimido às 08:00.` A dose sai como a API
 * a grava, com ponto decimal.
 */
export function reminderMessage({
  medicationName,
  doseAmount,
  doseUnit,
  scheduledAt,
}) {
  return `${medicationName} ${doseAmount} ${plural(DOSE_TEXT[doseUnit], doseAmount)} às ${timeFormatter.format(new Date(scheduledAt))}.`;
}

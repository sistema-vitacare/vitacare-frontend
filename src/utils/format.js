// Datas e valores para exibição. A API trata datas civis (nascimento) sem
// fuso e instantes em UTC; a tela mostra os instantes no fuso de Brasília,
// o mesmo que a API usa para separar os dias do período.

export const TIME_ZONE = 'America/Sao_Paulo';

// Brasília está em UTC−3 o ano todo desde 2019, sem horário de verão.
export const SAO_PAULO_OFFSET = '-03:00';

/** Máscara fixa que a API aplica aos campos ocultos do familiar. */
export const MASKED_VALUE = '********';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Data de hoje em Brasília, no formato `AAAA-MM-DD`. */
export function todayInSaoPaulo(now = new Date()) {
  return dayFormatter.format(now);
}

export function ageFromBirthDate(birthDate, now = new Date()) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = todayInSaoPaulo(now)
    .split('-')
    .map(Number);
  const beforeBirthday =
    todayMonth < month || (todayMonth === month && todayDay < day);
  return todayYear - year - (beforeBirthday ? 1 : 0);
}

// Data civil formatada pelo texto, sem `Date`: `new Date('1941-05-17')` é
// meia-noite UTC, que em Brasília ainda é o dia anterior.
export function formatDate(date) {
  if (!date) {
    return '';
  }
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateTime(instant) {
  if (!instant) {
    return '';
  }
  return dateTimeFormatter.format(new Date(instant)).replace(',', '');
}

export function isMasked(value) {
  return value === MASKED_VALUE;
}

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

/** Número com vírgula decimal e no máximo duas casas: `36.5` vira `36,5`. */
export function formatNumber(value) {
  return numberFormatter.format(value);
}

/**
 * Valor de uma resposta de registro para leitura: número com vírgula e
 * unidade, sim ou não pelos rótulos da tela e lista de escolhas separada
 * por vírgula.
 */
export function formatAnswer(answer, { yes, no }) {
  if (answer.fieldType === 'boolean') {
    return answer.value ? yes : no;
  }
  if (Array.isArray(answer.value)) {
    return answer.value.join(', ');
  }
  if (typeof answer.value === 'number') {
    const value = formatNumber(answer.value);
    return answer.unit ? `${value} ${answer.unit}` : value;
  }
  return answer.value;
}

// A dose aceita até três casas (0,125 mg); o resto da tela usa duas.
const doseFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

/**
 * Dose com vírgula decimal e a unidade no singular ou no plural, como a
 * mensagem do lembrete da API: `0,5 comprimido`, `2 comprimidos`.
 */
export function formatDose(amount, unit, labels) {
  const label = amount > 1 ? labels[unit].many : labels[unit].one;
  return `${doseFormatter.format(amount)} ${label}`;
}

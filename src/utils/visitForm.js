// Valores da tela de registro de visita e a conversão para o corpo de
// POST /follow-ups. As respostas são conferidas com as regras da API
// (`followUpAnswers.js`); aqui ficam só a hora da visita e a ponte entre os
// campos da tela e a lista de respostas.
import { todayInSaoPaulo } from './format.js';

// Brasília está em UTC−3 o ano todo desde 2019 (ver `followUps.js`).
const SAO_PAULO_OFFSET = '-03:00';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Agora em Brasília no formato do campo de data e hora (`AAAA-MM-DDTHH:mm`). */
export function localDateTime(now = new Date()) {
  return `${todayInSaoPaulo(now)}T${timeFormatter.format(now)}`;
}

/** Hora local de Brasília do campo para o instante em UTC da API. */
export function visitedAtFromLocal(local) {
  return new Date(`${local}:00${SAO_PAULO_OFFSET}`).toISOString();
}

/** A visita está depois de agora? O campo não tem segundos. */
export function isFutureVisit(local, now = new Date()) {
  return Date.parse(visitedAtFromLocal(local)) > now.getTime();
}

/**
 * Respostas na ordem dos campos, todas presentes: a regra da API trata o
 * vazio. O número digitado com vírgula vai com ponto, como texto decimal,
 * para as casas decimais serem contadas sem arredondamento.
 */
export function answersFrom(fields, values) {
  return fields.map((field) => {
    const value = values[field.id] ?? null;
    if (field.fieldType === 'number' && typeof value === 'string') {
      const text = value.trim().replace(',', '.');
      return { fieldId: field.id, value: text === '' ? null : text };
    }
    return { fieldId: field.id, value };
  });
}

/**
 * Erros de `checkAnswers` por id do campo. O erro de valor aponta a
 * posição na lista enviada, que é a ordem dos campos; o obrigatório
 * ausente aponta o id.
 */
export function answerErrorsByField(fields, check) {
  if (check.kind !== 'invalid') {
    return {};
  }
  const errors = {};
  for (const { field, code } of check.errors) {
    const [, target] = field.split('.');
    const fieldId = /^\d+$/.test(target) ? fields[Number(target)]?.id : target;
    if (fieldId) {
      errors[fieldId] ??= code;
    }
  }
  return errors;
}

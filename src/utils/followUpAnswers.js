// Respostas de um registro de acompanhamento conferidas contra os campos da
// versão respondida, com as mesmas regras da API (`fieldAnswer.parser.ts` e
// `followUpAnswers.policy.ts` do backend): tipo e obrigatoriedade são as
// únicas regras. Valor fora da faixa clínica é dado a gravar, nunca erro;
// quem avisa é o alerta.

export const MAX_TEXT_ANSWER_LENGTH = 2000;

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

const EMPTY = { kind: 'empty' };
const value = (parsed) => ({ kind: 'value', value: parsed });
const invalid = (code) => ({ kind: 'invalid', code });

/** `0` e `false` são valores; vazio é só ausência, texto em branco ou `[]`. */
export function isEmptyAnswer(raw) {
  return (
    raw === null ||
    raw === undefined ||
    (typeof raw === 'string' && raw.trim() === '') ||
    (Array.isArray(raw) && raw.length === 0)
  );
}

// As casas decimais são contadas no texto, sem os zeros finais: `37.50`
// tem uma casa, como na API, que não converte para ponto flutuante antes.
function parseNumber(raw, decimalPlaces) {
  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return invalid('NOT_A_NUMBER');
  }
  const match = DECIMAL.exec(
    typeof raw === 'number' ? String(raw) : raw.trim(),
  );
  if (!match) {
    return invalid('NOT_A_NUMBER');
  }
  const [, sign, integer, fraction = ''] = match;
  const digits = fraction.replace(/0+$/, '');
  if (digits.length > decimalPlaces) {
    return invalid('TOO_MANY_DECIMALS');
  }
  return value(Number(`${sign}${integer}${digits ? `.${digits}` : ''}`));
}

function parseChoices(field, raw) {
  if (!Array.isArray(raw)) {
    return invalid('INVALID_TYPE');
  }
  if (
    raw.some(
      (item) => typeof item !== 'string' || !field.options.includes(item),
    )
  ) {
    return invalid('NOT_AN_OPTION');
  }
  if (new Set(raw).size !== raw.length) {
    return invalid('DUPLICATE_OPTION');
  }
  return value(field.options.filter((option) => raw.includes(option)));
}

/** Valor de um campo no tipo dele, ou o código do erro da API. */
export function parseFieldAnswer(field, raw) {
  if (isEmptyAnswer(raw)) {
    return EMPTY;
  }
  if (field.requirement === 'disabled') {
    return invalid('DISABLED');
  }
  switch (field.fieldType) {
    case 'number':
      return typeof raw === 'number' || typeof raw === 'string'
        ? parseNumber(raw, field.decimalPlaces ?? 0)
        : invalid('INVALID_TYPE');
    case 'scale':
      if (typeof raw !== 'number') {
        return invalid('INVALID_TYPE');
      }
      return Number.isInteger(raw) &&
        raw >= field.scaleMin &&
        raw <= field.scaleMax
        ? value(raw)
        : invalid('OUT_OF_SCALE');
    case 'boolean':
      return typeof raw === 'boolean' ? value(raw) : invalid('NOT_A_BOOLEAN');
    case 'text': {
      if (typeof raw !== 'string') {
        return invalid('INVALID_TYPE');
      }
      const text = raw.trim();
      return text.length > MAX_TEXT_ANSWER_LENGTH
        ? invalid('TOO_LONG')
        : value(text);
    }
    case 'single_choice':
      if (typeof raw !== 'string') {
        return invalid('INVALID_TYPE');
      }
      return field.options.includes(raw)
        ? value(raw)
        : invalid('NOT_AN_OPTION');
    case 'multiple_choice':
      return parseChoices(field, raw);
    default:
      return invalid('INVALID_TYPE');
  }
}

/**
 * Confere as respostas contra os campos da versão. Sem nenhum valor, o envio
 * é vazio; o obrigatório ausente aponta `answers.<fieldId>`, porque não há
 * posição na lista enviada.
 */
export function checkAnswers(fields, answers) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const seen = new Set();
  const provided = new Set();
  const errors = [];
  const items = [];
  answers.forEach((answer, index) => {
    const field = byId.get(answer.fieldId);
    if (!field) {
      errors.push({ field: `answers.${index}.fieldId`, code: 'UNKNOWN' });
      return;
    }
    if (seen.has(answer.fieldId)) {
      errors.push({ field: `answers.${index}.fieldId`, code: 'DUPLICATE' });
      return;
    }
    seen.add(answer.fieldId);
    const parsed = parseFieldAnswer(field, answer.value);
    if (parsed.kind !== 'empty') {
      provided.add(field.id);
    }
    if (parsed.kind === 'invalid') {
      errors.push({ field: `answers.${index}.value`, code: parsed.code });
    } else if (parsed.kind === 'value') {
      items.push({ fieldId: field.id, value: parsed.value });
    }
  });
  if (errors.length === 0 && items.length === 0) {
    return EMPTY;
  }
  for (const field of fields) {
    if (field.requirement === 'required' && !provided.has(field.id)) {
      errors.push({
        field: `answers.${field.id}`,
        code: 'REQUIRED',
        message: `${field.name} é obrigatório.`,
      });
    }
  }
  return errors.length > 0
    ? { kind: 'invalid', errors }
    : { kind: 'valid', items };
}

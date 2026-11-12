// Número digitado num campo de texto, como o brasileiro escreve: vírgula
// decimal. O texto que não é número segue como `NaN`, e a regra da API
// aponta o campo; o campo vazio fica ausente.

function parseNumber(text, pattern) {
  const value = text.trim().replace(',', '.');
  if (value === '') {
    return undefined;
  }
  return pattern.test(value) ? Number(value) : Number.NaN;
}

/** `0,5` vira 0.5; aceita sinal negativo. */
export function parseDecimal(text) {
  return parseNumber(text, /^-?\d+(\.\d+)?$/);
}

/** Só inteiros não negativos: `1,5` vira `NaN`. */
export function parseInteger(text) {
  return parseNumber(text, /^\d+$/);
}

/** Número para o campo de texto, com vírgula decimal. */
export function decimalText(value) {
  return String(value).replace('.', ',');
}

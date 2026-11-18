// Erros das regras da API (`[{ field, code }]`) por campo da tela.

/** O primeiro código de cada campo, que é o que a tela mostra. */
export function fieldErrorsFrom(errors) {
  const byField = {};
  for (const { field, code } of errors) {
    byField[field] ??= code;
  }
  return byField;
}

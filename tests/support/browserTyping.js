// Digitação como a do navegador: cada letra entra no fim do que o campo mostra
// e dispara o `input` fora do `act`. O `fireEvent.change` passa pelo `act`,
// que conclui a navegação do endereço antes de devolver, e esconderia a letra
// que o campo perde quando o valor só muda depois da navegação.
const setValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
).set;

/** Valor do campo logo depois de cada letra digitada. */
export function typeLikeBrowser(input, text) {
  return [...text].map((letter) => {
    setValue.call(input, input.value + letter);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value;
  });
}

/** O que o campo deve mostrar depois de cada letra: o texto até ela. */
export function prefixesOf(text) {
  return [...text].map((_, index) => [...text].slice(0, index + 1).join(''));
}

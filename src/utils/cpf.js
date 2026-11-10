// Cada dígito verificador é o resto de uma soma ponderada dos dígitos
// anteriores; resto 10 vira 0. É a mesma regra que a API aplica no cadastro.
function checkDigit(digits) {
  const weightStart = digits.length + 1;
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (weightStart - index),
    0,
  );
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  // Sequências como 111.111.111-11 passam na conta, mas não são CPFs emitidos.
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const numbers = [...digits].map(Number);
  const first = checkDigit(numbers.slice(0, 9));
  const second = checkDigit(numbers.slice(0, 10));
  return first === numbers[9] && second === numbers[10];
}

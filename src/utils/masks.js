// Máscaras aplicadas enquanto o usuário digita. Aceitam qualquer texto e
// descartam o que não é dígito, para que colar "529.982.247-25" ou
// "52998224725" dê o mesmo resultado.

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function maskCpf(value) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) {
    return d;
  }
  if (d.length <= 6) {
    return `${d.slice(0, 3)}.${d.slice(3)}`;
  }
  if (d.length <= 9) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Fixo com 10 dígitos e celular com 11: o hífen fica antes dos quatro
// últimos nos dois casos.
export function maskPhone(value) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length === 0) {
    return '';
  }
  if (d.length <= 2) {
    return `(${d}`;
  }
  const rest = d.slice(2);
  if (rest.length <= 4) {
    return `(${d.slice(0, 2)}) ${rest}`;
  }
  const split = d.length === 11 ? 5 : 4;
  if (rest.length <= split) {
    return `(${d.slice(0, 2)}) ${rest}`;
  }
  return `(${d.slice(0, 2)}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function maskZipCode(value) {
  const d = digitsOnly(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

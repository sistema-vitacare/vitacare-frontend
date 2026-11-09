/**
 * Iniciais do primeiro e do último nome, em maiúsculas, para o avatar.
 * Um nome só gera uma letra; nome vazio gera texto vazio.
 */
export function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (first.charAt(0) + last.charAt(0)).toLocaleUpperCase('pt-BR');
}

// Senha provisória do convite e da redefinição administrativa, no formato
// da API (`temporaryPassword.ts` do backend): 20 caracteres sem os que se
// confundem quando a senha é ditada ou copiada à mão (0, O, 1, l, I).
export const TEMPORARY_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const LENGTH = 20;

/** `random` devolve um número em [0, 1); os testes passam um sorteio fixo. */
export function generateTemporaryPassword(random = Math.random) {
  return Array.from(
    { length: LENGTH },
    () =>
      TEMPORARY_PASSWORD_ALPHABET[
        Math.floor(random() * TEMPORARY_PASSWORD_ALPHABET.length)
      ],
  ).join('');
}

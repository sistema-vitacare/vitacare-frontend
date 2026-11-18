// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  TEMPORARY_PASSWORD_ALPHABET,
  generateTemporaryPassword,
} from '../../src/utils/temporaryPassword.js';

describe('generateTemporaryPassword', () => {
  it('gera 20 caracteres do alfabeto da API', () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(20);
    expect(
      [...password].every((c) => TEMPORARY_PASSWORD_ALPHABET.includes(c)),
    ).toBe(true);
  });

  it('deixa fora os caracteres que se confundem ao ditar ou copiar à mão', () => {
    for (const ambiguous of ['0', 'O', '1', 'l', 'I']) {
      expect(TEMPORARY_PASSWORD_ALPHABET).not.toContain(ambiguous);
    }
  });

  it('usa letras maiúsculas e minúsculas e os dígitos de 2 a 9, 57 ao todo', () => {
    expect(TEMPORARY_PASSWORD_ALPHABET).toHaveLength(57);
  });

  it('escolhe cada caractere pelo sorteio recebido', () => {
    expect(generateTemporaryPassword(() => 0)).toBe('A'.repeat(20));
    expect(generateTemporaryPassword(() => 0.9999)).toBe('9'.repeat(20));
  });
});

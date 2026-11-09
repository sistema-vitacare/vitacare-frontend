// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isValidCpf } from '../../src/utils/cpf.js';

describe('isValidCpf', () => {
  it('aceita CPF com pontuação e dígitos verificadores corretos', () => {
    expect(isValidCpf('347.812.905-23')).toBe(true);
  });

  it('aceita CPF só com dígitos', () => {
    expect(isValidCpf('61509328424')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(isValidCpf('347.812.905-24')).toBe(false);
  });

  it('recusa sequência de um único dígito, que passa na conta mas não existe', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('recusa quantidade de dígitos diferente de 11', () => {
    expect(isValidCpf('3478129052')).toBe(false);
  });

  it('recusa valor vazio ou ausente', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf(null)).toBe(false);
  });
});

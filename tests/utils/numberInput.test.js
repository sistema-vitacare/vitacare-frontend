// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  decimalText,
  parseDecimal,
  parseInteger,
} from '../../src/utils/numberInput.js';

describe('parseDecimal e parseInteger', () => {
  it('lê vírgula decimal e sinal, e deixa o vazio ausente', () => {
    expect(parseDecimal(' 0,5 ')).toBe(0.5);
    expect(parseDecimal('-1,25')).toBe(-1.25);
    expect(parseDecimal('160')).toBe(160);
    expect(parseDecimal('')).toBeUndefined();
    expect(parseInteger('7')).toBe(7);
    expect(parseInteger('  ')).toBeUndefined();
  });

  it('devolve NaN para texto que não é número', () => {
    expect(parseDecimal('meio')).toBeNaN();
    expect(parseDecimal('1,2,3')).toBeNaN();
    expect(parseInteger('1,5')).toBeNaN();
    expect(parseInteger('-1')).toBeNaN();
  });
});

describe('decimalText', () => {
  it('escreve o número com vírgula decimal', () => {
    expect(decimalText(0.5)).toBe('0,5');
    expect(decimalText(160)).toBe('160');
  });
});

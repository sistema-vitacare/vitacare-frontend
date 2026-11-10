// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast.js';

describe('contrastRatio', () => {
  it('dá 21:1 entre branco e preto, o máximo da escala', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('dá 1:1 entre duas cores iguais', () => {
    expect(contrastRatio('#0D7D77', '#0D7D77')).toBeCloseTo(1, 5);
  });

  it('dá 4,98:1 entre o teal de ação e o branco', () => {
    expect(contrastRatio('#0D7D77', '#FFFFFF')).toBeCloseTo(4.98, 2);
  });

  it('não depende da ordem das cores', () => {
    expect(contrastRatio('#183058', '#F3F5F7')).toBe(
      contrastRatio('#F3F5F7', '#183058'),
    );
  });
});

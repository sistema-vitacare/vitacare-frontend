// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { initials } from '../../src/utils/initials.js';

describe('initials', () => {
  it.each([
    ['Helena Vasconcelos', 'HV'],
    ['Rafael Moura Brandão', 'RB'],
    ['  Beatriz   Okamoto  ', 'BO'],
    ['Ícaro Ávila', 'ÍÁ'],
    ['caio furtado', 'CF'],
    ['Caio', 'C'],
  ])('de "%s" são "%s"', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('são vazias quando não há nome', () => {
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
  });
});

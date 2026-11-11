// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  digitsOnly,
  maskCpf,
  maskPhone,
  maskZipCode,
} from '../../src/utils/masks.js';

describe('digitsOnly', () => {
  it('mantém só os dígitos', () => {
    expect(digitsOnly('529.982.247-25')).toBe('52998224725');
    expect(digitsOnly(null)).toBe('');
  });
});

describe('maskCpf', () => {
  it.each([
    ['52998224725', '529.982.247-25'],
    ['529.982.247-25', '529.982.247-25'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247251234', '529.982.247-25'],
    ['abc', ''],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskCpf(input)).toBe(expected);
  });
});

describe('maskPhone', () => {
  it.each([
    ['16997873407', '(16) 99787-3407'],
    ['1636248170', '(16) 3624-8170'],
    ['16', '(16'],
    ['169978', '(16) 9978'],
    ['', ''],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskPhone(input)).toBe(expected);
  });
});

describe('maskZipCode', () => {
  it.each([
    ['14091256', '14091-256'],
    ['14091', '14091'],
    ['140912', '14091-2'],
    ['14091-2569', '14091-256'],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskZipCode(input)).toBe(expected);
  });
});

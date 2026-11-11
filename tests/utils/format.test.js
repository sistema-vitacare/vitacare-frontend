// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MASKED_VALUE,
  ageFromBirthDate,
  formatDate,
  formatDateTime,
  formatNumber,
  isMasked,
  todayInSaoPaulo,
} from '../../src/utils/format.js';

describe('todayInSaoPaulo', () => {
  it('usa a data de Brasília, que ainda é o dia anterior às 01:00 UTC', () => {
    expect(todayInSaoPaulo(new Date('2026-11-11T01:00:00.000Z'))).toBe(
      '2026-11-10',
    );
    expect(todayInSaoPaulo(new Date('2026-11-11T03:00:00.000Z'))).toBe(
      '2026-11-11',
    );
  });
});

describe('ageFromBirthDate', () => {
  const now = new Date('2026-11-10T15:00:00.000Z');

  it('conta os anos completos', () => {
    expect(ageFromBirthDate('1941-05-17', now)).toBe(85);
  });

  it('não conta o ano antes do aniversário', () => {
    expect(ageFromBirthDate('1948-11-11', now)).toBe(77);
  });

  it('conta o ano no dia do aniversário', () => {
    expect(ageFromBirthDate('1948-11-10', now)).toBe(78);
  });
});

describe('formatDate e formatDateTime', () => {
  it('formata a data civil sem mudar o dia por causa do fuso', () => {
    expect(formatDate('1941-05-17')).toBe('17/05/1941');
  });

  it('mostra o instante no horário de Brasília', () => {
    expect(formatDateTime('2026-11-04T12:30:00.000Z')).toBe('04/11/2026 09:30');
  });

  it('devolve vazio para valor ausente', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });
});

describe('isMasked', () => {
  it('reconhece a máscara fixa que a API aplica para o familiar', () => {
    expect(isMasked(MASKED_VALUE)).toBe(true);
    expect(isMasked('********')).toBe(true);
    expect(isMasked('Particular')).toBe(false);
    expect(isMasked(null)).toBe(false);
  });
});

describe('formatNumber', () => {
  it('usa vírgula decimal e no máximo duas casas, como no Brasil', () => {
    expect(formatNumber(36.5)).toBe('36,5');
    expect(formatNumber(109.2)).toBe('109,2');
    expect(formatNumber(2.0555)).toBe('2,06');
    expect(formatNumber(126)).toBe('126');
    expect(formatNumber(-3)).toBe('-3');
  });
});

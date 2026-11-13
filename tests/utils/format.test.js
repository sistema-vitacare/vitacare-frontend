// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MASKED_VALUE,
  ageFromBirthDate,
  formatAnswer,
  formatDate,
  formatDateTime,
  formatMessageDateTime,
  formatDose,
  formatNumber,
  isMasked,
  maskPersonName,
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

describe('formatMessageDateTime', () => {
  it('escreve data e hora de Brasília como as mensagens da API', () => {
    expect(formatMessageDateTime('2026-11-16T12:30:00.000Z')).toBe(
      '16/11/2026 às 09:30',
    );
    // 02:30 UTC ainda é o dia anterior em Brasília.
    expect(formatMessageDateTime('2026-11-17T02:30:00.000Z')).toBe(
      '16/11/2026 às 23:30',
    );
    expect(formatMessageDateTime('2026-11-17T03:00:00.000Z')).toBe(
      '17/11/2026 às 00:00',
    );
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

describe('formatAnswer', () => {
  const labels = { yes: 'Sim', no: 'Não' };
  const answer = (fieldType, value, unit = null) => ({
    fieldType,
    value,
    unit,
  });

  it('mostra número com vírgula e unidade, e escala sem unidade', () => {
    expect(formatAnswer(answer('number', 36.5, '°C'), labels)).toBe('36,5 °C');
    expect(formatAnswer(answer('scale', 0), labels)).toBe('0');
  });

  it('mostra sim e não, a escolha e a lista de escolhas', () => {
    expect(formatAnswer(answer('boolean', false), labels)).toBe('Não');
    expect(formatAnswer(answer('boolean', true), labels)).toBe('Sim');
    expect(formatAnswer(answer('single_choice', 'Bom'), labels)).toBe('Bom');
    expect(
      formatAnswer(answer('multiple_choice', ['Banho', 'Curativo']), labels),
    ).toBe('Banho, Curativo');
  });
});

describe('formatDose', () => {
  const labels = {
    mg: { one: 'mg', many: 'mg' },
    tablet: { one: 'comprimido', many: 'comprimidos' },
  };

  it('usa vírgula decimal, até três casas, e o plural acima de um', () => {
    expect(formatDose(0.5, 'tablet', labels)).toBe('0,5 comprimido');
    expect(formatDose(1, 'tablet', labels)).toBe('1 comprimido');
    expect(formatDose(2, 'tablet', labels)).toBe('2 comprimidos');
    expect(formatDose(0.125, 'mg', labels)).toBe('0,125 mg');
    expect(formatDose(850, 'mg', labels)).toBe('850 mg');
  });
});

describe('maskPersonName', () => {
  it('deixa a inicial de cada palavra e troca o resto por asteriscos, como a API', () => {
    expect(maskPersonName('Paulo Lima')).toBe('P**** L***');
    expect(maskPersonName('Lúcia  de Andrade')).toBe('L****  d* A******');
  });

  it('mantém palavra de uma letra', () => {
    expect(maskPersonName('A')).toBe('A');
  });
});

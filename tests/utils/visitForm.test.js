// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkAnswers } from '../../src/utils/followUpAnswers.js';
import {
  answerErrorsByField,
  answersFrom,
  isFutureVisit,
  localDateTime,
  visitedAtFromLocal,
} from '../../src/utils/visitForm.js';

const field = (id, props) => ({
  id,
  name: id,
  requirement: 'optional',
  decimalPlaces: null,
  scaleMin: null,
  scaleMax: null,
  options: null,
  ...props,
});

const fields = [
  field('pressao', {
    fieldType: 'number',
    decimalPlaces: 0,
    requirement: 'required',
  }),
  field('temperatura', { fieldType: 'number', decimalPlaces: 1 }),
  field('dor', { fieldType: 'scale', scaleMin: 0, scaleMax: 10 }),
  field('banho', { fieldType: 'boolean' }),
];

describe('data e hora da visita', () => {
  it('mostra o agora no fuso de Brasília, sem segundos', () => {
    expect(localDateTime(new Date('2026-11-10T15:07:45.000Z'))).toBe(
      '2026-11-10T12:07',
    );
  });

  it('converte a hora local de Brasília para o instante da API', () => {
    expect(visitedAtFromLocal('2026-11-10T12:07')).toBe(
      '2026-11-10T15:07:00.000Z',
    );
  });

  it('chama de futura só a visita depois de agora', () => {
    const now = new Date('2026-11-10T15:07:45.000Z');

    expect(isFutureVisit('2026-11-10T12:07', now)).toBe(false);
    expect(isFutureVisit('2026-11-10T12:08', now)).toBe(true);
  });
});

describe('answersFrom', () => {
  it('manda todos os campos na ordem, com vírgula decimal trocada por ponto e vazio como nulo', () => {
    expect(
      answersFrom(fields, { pressao: ' 130 ', temperatura: '36,5', dor: 0 }),
    ).toEqual([
      { fieldId: 'pressao', value: '130' },
      { fieldId: 'temperatura', value: '36.5' },
      { fieldId: 'dor', value: 0 },
      { fieldId: 'banho', value: null },
    ]);
  });
});

describe('answerErrorsByField', () => {
  it('aponta cada erro da regra no campo, pela posição ou pelo id', () => {
    const answers = answersFrom(fields, { temperatura: '36,55', banho: false });

    expect(answerErrorsByField(fields, checkAnswers(fields, answers))).toEqual({
      temperatura: 'TOO_MANY_DECIMALS',
      pressao: 'REQUIRED',
    });
  });

  it('não aponta nada no envio válido nem no vazio', () => {
    expect(
      answerErrorsByField(
        fields,
        checkAnswers(fields, answersFrom(fields, { pressao: '120' })),
      ),
    ).toEqual({});
    expect(
      answerErrorsByField(
        fields,
        checkAnswers(fields, answersFrom(fields, {})),
      ),
    ).toEqual({});
  });
});

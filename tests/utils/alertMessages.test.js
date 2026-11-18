// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  absenceMessage,
  readingMessage,
  reminderMessage,
} from '../../src/utils/alertMessages.js';

describe('readingMessage', () => {
  it('traz o campo, o valor e a regra, com a unidade do campo', () => {
    expect(
      readingMessage({
        fieldName: 'Pressão sistólica',
        unit: 'mmHg',
        value: '172',
        operator: 'gt',
        referenceValue: 160,
      }),
    ).toBe('Pressão sistólica: 172 mmHg (maior que 160 mmHg).');
    expect(
      readingMessage({
        fieldName: 'Dor',
        unit: null,
        value: '0',
        operator: 'lte',
        referenceValue: 0.5,
      }),
    ).toBe('Dor: 0 (menor ou igual a 0.5).');
  });
});

describe('absenceMessage', () => {
  it('traz o formulário, o início da contagem em Brasília e a frequência', () => {
    expect(
      absenceMessage({
        formName: 'Sinais vitais',
        since: '2026-11-02T12:30:00.000Z',
        frequency: { interval: 1, unit: 'weeks' },
      }),
    ).toBe(
      'Sem registro de Sinais vitais desde 02/11/2026 09:30; esperado a cada 1 semana.',
    );
    expect(
      absenceMessage({
        formName: 'Acompanhamento diário',
        since: '2026-11-10T03:00:00.000Z',
        frequency: { interval: 12, unit: 'hours' },
      }),
    ).toBe(
      'Sem registro de Acompanhamento diário desde 10/11/2026 00:00; esperado a cada 12 horas.',
    );
  });
});

describe('reminderMessage', () => {
  it('traz o medicamento, a dose no singular ou no plural e a hora de Brasília', () => {
    expect(
      reminderMessage({
        medicationName: 'Losartana potássica 50 mg',
        doseAmount: 1,
        doseUnit: 'tablet',
        scheduledAt: '2026-11-12T11:00:00.000Z',
      }),
    ).toBe('Losartana potássica 50 mg 1 comprimido às 08:00.');
    expect(
      reminderMessage({
        medicationName: 'Insulina NPH',
        doseAmount: 10,
        doseUnit: 'iu',
        scheduledAt: '2026-11-12T10:00:00.000Z',
      }),
    ).toBe('Insulina NPH 10 UI às 07:00.');
    expect(
      reminderMessage({
        medicationName: 'Dipirona',
        doseAmount: 0.5,
        doseUnit: 'tablet',
        scheduledAt: '2026-11-12T23:30:00.000Z',
      }),
    ).toBe('Dipirona 0.5 comprimido às 20:30.');
  });
});

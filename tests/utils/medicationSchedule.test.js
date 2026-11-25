// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  daysSinceStart,
  occurrencesBetween,
} from '../../src/utils/medicationSchedule.js';

// 12/11/2026, 10:00 em Brasília.
const NOW = new Date('2026-11-12T13:00:00.000Z');
const TODAY = '2026-11-12';

function schedule(changes = {}) {
  return {
    startDate: '2026-10-01',
    endDate: null,
    intervalDays: 1,
    times: ['08:00', '20:00'],
    ...changes,
  };
}

describe('occurrencesBetween', () => {
  it('lista, em ordem, os horários depois de `from` e até `to`', () => {
    const from = new Date('2026-11-11T13:00:00.000Z');

    expect(occurrencesBetween(schedule(), from, NOW)).toEqual([
      new Date('2026-11-11T23:00:00.000Z'),
      new Date('2026-11-12T11:00:00.000Z'),
    ]);
  });

  it('pula os dias fora do intervalo e os depois do fim', () => {
    const from = new Date('2026-11-09T13:00:00.000Z');
    const everyOtherDay = schedule({
      startDate: '2026-11-08',
      endDate: '2026-11-11',
      intervalDays: 2,
      times: ['08:00'],
    });

    expect(occurrencesBetween(everyOtherDay, from, NOW)).toEqual([
      new Date('2026-11-10T11:00:00.000Z'),
    ]);
  });
});

describe('daysSinceStart', () => {
  it('conta os dias desde o início, pelo dia de Brasília', () => {
    expect(daysSinceStart('2026-10-01', NOW)).toBe(42);
    // 02:00 UTC de 13/11 ainda é 12/11 em Brasília.
    expect(daysSinceStart(TODAY, new Date('2026-11-13T02:00:00.000Z'))).toBe(0);
  });

  it('é negativo para início no futuro', () => {
    expect(daysSinceStart('2026-11-15', NOW)).toBe(-3);
  });
});

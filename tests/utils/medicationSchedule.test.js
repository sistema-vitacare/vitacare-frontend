// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { daysSinceStart } from '../../src/utils/medicationSchedule.js';

// 12/11/2026, 10:00 em Brasília.
const NOW = new Date('2026-11-12T13:00:00.000Z');
const TODAY = '2026-11-12';

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

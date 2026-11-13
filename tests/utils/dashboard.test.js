// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  countByDay,
  isInPeriod,
  sortByPriority,
} from '../../src/utils/dashboard.js';

const period = { from: '2026-11-10', to: '2026-11-12' };

describe('isInPeriod', () => {
  it('compara o dia do instante em Brasília, e não em UTC', () => {
    // 02h30 UTC de 13/11 ainda é 23h30 de 12/11 em Brasília.
    expect(isInPeriod('2026-11-13T02:30:00.000Z', period)).toBe(true);
    expect(isInPeriod('2026-11-10T02:30:00.000Z', period)).toBe(false);
  });
});

describe('countByDay', () => {
  it('conta por dia de Brasília e põe zero nos dias sem nada', () => {
    expect(
      countByDay(
        [
          '2026-11-10T12:00:00.000Z',
          '2026-11-10T20:00:00.000Z',
          '2026-11-13T02:30:00.000Z',
          '2026-11-09T12:00:00.000Z',
        ],
        period,
      ),
    ).toEqual([
      { date: '2026-11-10', total: 2 },
      { date: '2026-11-11', total: 0 },
      { date: '2026-11-12', total: 1 },
    ]);
  });
});

describe('sortByPriority', () => {
  const alert = (id, severity, generatedAt) => ({ id, severity, generatedAt });

  it('põe crítico antes de atenção e informativo e, em cada um, o mais recente antes', () => {
    const alerts = [
      alert('a', 'info', '2026-11-12T10:00:00.000Z'),
      alert('b', 'warning', '2026-11-11T10:00:00.000Z'),
      alert('c', 'critical', '2026-11-10T10:00:00.000Z'),
      alert('d', 'warning', '2026-11-12T09:00:00.000Z'),
      alert('e', 'critical', '2026-11-12T08:00:00.000Z'),
    ];

    expect(sortByPriority(alerts).map((item) => item.id)).toEqual([
      'e',
      'c',
      'd',
      'b',
      'a',
    ]);
  });

  it('não altera a lista recebida', () => {
    const alerts = [
      alert('a', 'info', '2026-11-12T10:00:00.000Z'),
      alert('b', 'critical', '2026-11-11T10:00:00.000Z'),
    ];
    sortByPriority(alerts);

    expect(alerts.map((item) => item.id)).toEqual(['a', 'b']);
  });
});

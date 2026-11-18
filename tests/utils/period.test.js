// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  periodDays,
  previousPeriod,
  resolvePeriod,
  shortcutPeriod,
} from '../../src/utils/period.js';

const TODAY = '2026-11-12';

describe('resolvePeriod', () => {
  it('sem datas, usa os últimos 30 dias até hoje', () => {
    expect(resolvePeriod({}, TODAY)).toEqual({
      period: { from: '2026-10-14', to: TODAY },
      errors: [],
    });
  });

  it('só com o início, termina hoje', () => {
    expect(resolvePeriod({ from: '2026-11-01' }, TODAY).period).toEqual({
      from: '2026-11-01',
      to: TODAY,
    });
  });

  it('só com o fim, começa 29 dias antes dele', () => {
    expect(resolvePeriod({ to: '2026-10-31' }, TODAY).period).toEqual({
      from: '2026-10-02',
      to: '2026-10-31',
    });
  });

  it('recusa o fim anterior ao início, apontando o fim, como o DTO da API', () => {
    expect(
      resolvePeriod({ from: '2026-11-10', to: '2026-11-01' }, TODAY).errors,
    ).toEqual([{ field: 'to', code: 'IS_CALENDAR_DATE' }]);
  });

  it('recusa data que não existe no calendário', () => {
    expect(resolvePeriod({ from: '2026-02-30' }, TODAY).errors).toEqual([
      { field: 'from', code: 'IS_CALENDAR_DATE' },
    ]);
  });

  it('recusa só o início no futuro, porque o fim seria hoje', () => {
    expect(resolvePeriod({ from: '2026-11-13' }, TODAY).errors).toEqual([
      { field: 'from', code: 'AFTER_END' },
    ]);
  });

  it('aceita período de 366 dias e datas futuras com o fim informado', () => {
    expect(
      resolvePeriod({ from: '2025-11-12', to: TODAY }, TODAY).errors,
    ).toEqual([]);
    expect(
      resolvePeriod({ from: '2026-12-01', to: '2026-12-10' }, TODAY).errors,
    ).toEqual([]);
  });

  it('recusa período de 367 dias, apontando o fim', () => {
    expect(
      resolvePeriod({ from: '2025-11-11', to: TODAY }, TODAY).errors,
    ).toEqual([{ field: 'to', code: 'PERIOD_TOO_LONG' }]);
  });
});

describe('previousPeriod', () => {
  it('devolve os mesmos dias imediatamente antes do início', () => {
    expect(previousPeriod({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: '2026-08-31',
      to: '2026-09-30',
    });
    expect(previousPeriod({ from: TODAY, to: TODAY })).toEqual({
      from: '2026-11-11',
      to: '2026-11-11',
    });
  });
});

describe('periodDays', () => {
  it('lista cada dia do período, inclusive na virada do mês', () => {
    expect(periodDays({ from: '2026-10-30', to: '2026-11-02' })).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });
});

describe('shortcutPeriod', () => {
  it('traduz os atalhos do painel em datas que terminam hoje', () => {
    expect(shortcutPeriod('today', TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(shortcutPeriod('7', TODAY)).toEqual({
      from: '2026-11-06',
      to: TODAY,
    });
    expect(shortcutPeriod('30', TODAY)).toEqual({
      from: '2026-10-14',
      to: TODAY,
    });
    expect(shortcutPeriod('90', TODAY)).toEqual({
      from: '2026-08-15',
      to: TODAY,
    });
  });

  it('usa o padrão de 30 dias para atalho desconhecido', () => {
    expect(shortcutPeriod('12', TODAY)).toEqual({
      from: '2026-10-14',
      to: TODAY,
    });
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildIndicators } from '../../src/utils/evolution.js';

const day = (n, hour = 12) =>
  new Date(Date.UTC(2026, 9, 1 + n, hour)).toISOString();

describe('buildIndicators', () => {
  it('reproduz a conta do manual da API: três glicemias em 01, 10 e 19/10', () => {
    const points = [
      { value: 105, visitedAt: day(0) },
      { value: 98, visitedAt: day(9) },
      { value: 142, visitedAt: day(18) },
    ];

    expect(buildIndicators(points)).toEqual({
      sampleSize: 3,
      min: 98,
      max: 142,
      mean: 115,
      variation: 37,
      trend: { slopePerDay: 2.056, direction: 'rising' },
      unavailable: [],
    });
  });

  it('com uma medição, aponta variação e tendência como indisponíveis, com a amostra mínima', () => {
    expect(
      buildIndicators([{ value: 3, visitedAt: day(0) }]).unavailable,
    ).toEqual([
      {
        indicator: 'variation',
        reason: 'INSUFFICIENT_SAMPLES',
        minimumSamples: 2,
      },
      { indicator: 'trend', reason: 'INSUFFICIENT_SAMPLES', minimumSamples: 3 },
    ]);
  });

  it('com duas medições, só a tendência fica indisponível', () => {
    expect(
      buildIndicators([
        { value: 7, visitedAt: day(0) },
        { value: 4, visitedAt: day(1) },
      ]).unavailable,
    ).toEqual([
      { indicator: 'trend', reason: 'INSUFFICIENT_SAMPLES', minimumSamples: 3 },
    ]);
  });

  it('com todas as medições no mesmo instante, a tendência fica indisponível por falta de intervalo', () => {
    const points = [1, 2, 3].map((value) => ({ value, visitedAt: day(0) }));

    expect(buildIndicators(points).unavailable).toEqual([
      {
        indicator: 'trend',
        reason: 'INSUFFICIENT_TIME_SPAN',
        minimumSamples: 3,
      },
    ]);
  });

  it('com uma medição, só a média sai; variação e tendência ficam vazias', () => {
    expect(buildIndicators([{ value: 0, visitedAt: day(0) }])).toMatchObject({
      sampleSize: 1,
      mean: 0,
      variation: null,
      trend: null,
    });
  });

  it('com duas medições, sai a variação, mas não a tendência', () => {
    expect(
      buildIndicators([
        { value: 7, visitedAt: day(0) },
        { value: 4, visitedAt: day(1) },
      ]),
    ).toMatchObject({ variation: -3, trend: null });
  });

  it('não calcula tendência quando todas as medições são do mesmo instante', () => {
    const points = [1, 2, 3].map((value) => ({ value, visitedAt: day(0) }));

    expect(buildIndicators(points).trend).toBeNull();
  });

  it('marca a tendência como estável só quando a inclinação arredondada é zero', () => {
    const points = [5, 5, 5].map((value, index) => ({
      value,
      visitedAt: day(index),
    }));

    expect(buildIndicators(points).trend).toEqual({
      slopePerDay: 0,
      direction: 'flat',
    });
  });

  it('marca a queda pelo sinal da inclinação', () => {
    const points = [10, 8, 6].map((value, index) => ({
      value,
      visitedAt: day(index),
    }));

    expect(buildIndicators(points).trend).toEqual({
      slopePerDay: -2,
      direction: 'falling',
    });
  });
});

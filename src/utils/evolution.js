// Indicadores de uma série de medições, com as fórmulas que a API usa em
// GET /patients/:id/evolution (decisões de 09/11/2026 no manual
// `patients-evolucao.md`): média simples, variação = último − primeiro e
// tendência = inclinação da reta de mínimos quadrados, em unidade por dia.

const DAY_MS = 24 * 60 * 60 * 1000;

// Amostra mínima de cada indicador na API; abaixo dela, o indicador sai nulo
// e entra em `unavailable` com o motivo, que o relatório mostra (UC10).
export const MINIMUM_SAMPLES = Object.freeze({
  mean: 1,
  variation: 2,
  trend: 3,
});

const missing = (indicator, reason = 'INSUFFICIENT_SAMPLES') => ({
  indicator,
  reason,
  minimumSamples: MINIMUM_SAMPLES[indicator],
});

const round3 = (value) => Math.round(value * 1000) / 1000 + 0;

function trendOf(points) {
  const start = Date.parse(points[0].visitedAt);
  const times = points.map(
    (point) => (Date.parse(point.visitedAt) - start) / DAY_MS,
  );
  // Sem intervalo entre as medições, a reta não tem inclinação.
  if (new Set(times).size < 2) {
    return null;
  }
  const meanTime = times.reduce((sum, t) => sum + t, 0) / times.length;
  const meanValue =
    points.reduce((sum, point) => sum + point.value, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  times.forEach((t, index) => {
    numerator += (t - meanTime) * (points[index].value - meanValue);
    denominator += (t - meanTime) ** 2;
  });
  const slopePerDay = round3(numerator / denominator);
  let direction = 'flat';
  if (slopePerDay > 0) {
    direction = 'rising';
  } else if (slopePerDay < 0) {
    direction = 'falling';
  }
  return { slopePerDay, direction };
}

/**
 * `points` vem em ordem de visita, da mais antiga para a mais recente, como
 * na API; cada ponto tem `value` e `visitedAt`.
 */
export function buildIndicators(points) {
  const values = points.map((point) => point.value);
  const unavailable = [];
  const enough = (indicator) => {
    if (values.length >= MINIMUM_SAMPLES[indicator]) {
      return true;
    }
    unavailable.push(missing(indicator));
    return false;
  };
  const mean = enough('mean')
    ? round3(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const variation = enough('variation')
    ? round3(values.at(-1) - values[0])
    : null;
  let trend = null;
  if (enough('trend')) {
    trend = trendOf(points);
    if (!trend) {
      unavailable.push(missing('trend', 'INSUFFICIENT_TIME_SPAN'));
    }
  }
  return {
    sampleSize: points.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    variation,
    trend,
    unavailable,
  };
}

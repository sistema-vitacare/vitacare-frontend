// Indicadores de uma série de medições, com as fórmulas que a API usa em
// GET /patients/:id/evolution (decisões de 09/11/2026 no manual
// `patients-evolucao.md`): média simples, variação = último − primeiro e
// tendência = inclinação da reta de mínimos quadrados, em unidade por dia.

const DAY_MS = 24 * 60 * 60 * 1000;

const round3 = (value) => Math.round(value * 1000) / 1000 + 0;

function trendOf(points) {
  const start = Date.parse(points[0].visitedAt);
  const times = points.map(
    (point) => (Date.parse(point.visitedAt) - start) / DAY_MS,
  );
  // Amostra mínima da API: 3 medições em pelo menos 2 instantes distintos.
  if (points.length < 3 || new Set(times).size < 2) {
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
  return {
    sampleSize: points.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: round3(values.reduce((sum, value) => sum + value, 0) / values.length),
    variation: points.length < 2 ? null : round3(values.at(-1) - values[0]),
    trend: trendOf(points),
  };
}

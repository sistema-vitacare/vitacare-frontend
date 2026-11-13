import { Box, Card, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { evolutionSeriesContent as content } from '../data/evolutionSeries.js';
import { formatDate, formatNumber } from '../utils/format.js';

function trendText(trend) {
  const slope = formatNumber(Math.abs(trend.slopePerDay));
  return content.directions[trend.direction](slope);
}

/**
 * Uma série de `GET /patients/{id}/evolution` (ou do relatório): gráfico das
 * medições e média, variação e tendência. Indicador que a API não calculou
 * mostra o motivo, em vez de um valor.
 */
export default function EvolutionSeriesCard({ series }) {
  const { indicators, unit } = series;
  const suffix = unit ? ` ${unit}` : '';
  const missing = new Map(
    indicators.unavailable.map((item) => [item.indicator, item]),
  );
  const value = (indicator, text) =>
    missing.has(indicator) ? content.unavailable(missing.get(indicator)) : text;
  const items = [
    [
      content.mean,
      value('mean', `${formatNumber(indicators.mean)}${suffix}`),
      missing.has('mean'),
    ],
    [
      content.variation,
      value('variation', `${formatNumber(indicators.variation)}${suffix}`),
      missing.has('variation'),
    ],
    [
      content.trend,
      missing.has('trend')
        ? content.unavailable(missing.get('trend'))
        : trendText(indicators.trend),
      missing.has('trend'),
    ],
  ];
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h3">
        {series.name}
        {unit ? ` (${unit})` : ''}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {series.form.name}
      </Typography>
      <Box
        component="figure"
        aria-label={content.chartLabel(series.name)}
        sx={{ m: 0, mt: 1 }}
      >
        <LineChart
          height={180}
          margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
          xAxis={[
            {
              data: series.points.map((point) => new Date(point.visitedAt)),
              scaleType: 'time',
              valueFormatter: (date) =>
                formatDate(date.toISOString().slice(0, 10)),
            },
          ]}
          yAxis={[
            series.fieldType === 'scale'
              ? { min: series.scaleMin, max: series.scaleMax, width: 36 }
              : { width: 36 },
          ]}
          series={[
            {
              data: series.points.map((point) => point.value),
              color: 'var(--chart-line)',
              // Reta entre as medições: a curva suavizada sugeriria valores
              // que ninguém mediu entre uma visita e outra.
              curve: 'linear',
              showMark: true,
            },
          ]}
          sx={(theme) => ({ '--chart-line': theme.palette.primary.main })}
        />
      </Box>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {items.map(([label, text, unavailable]) => (
          <Box key={label}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant={unavailable ? 'caption' : 'body2'}
              color={unavailable ? 'text.secondary' : 'text.primary'}
              sx={{
                m: 0,
                fontWeight: unavailable ? 400 : 650,
                display: 'block',
              }}
            >
              {text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

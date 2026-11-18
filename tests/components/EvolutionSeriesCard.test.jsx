import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EvolutionSeriesCard from '../../src/components/EvolutionSeriesCard.jsx';
import { evolutionSeriesContent as content } from '../../src/data/evolutionSeries.js';
import { theme } from '../../src/styles/theme.js';
import { buildIndicators } from '../../src/utils/evolution.js';

const day = (n) => new Date(Date.UTC(2026, 9, 1 + n, 12)).toISOString();

function series(values) {
  const points = values.map((value, index) => ({
    value,
    visitedAt: day(index * 3),
    followUpId: `f${index}`,
  }));
  return {
    fieldKey: 'k1',
    name: 'Glicemia capilar',
    fieldType: 'number',
    unit: 'mg/dL',
    scaleMin: null,
    scaleMax: null,
    section: 'Sinais vitais',
    form: { id: 'form', name: 'Sinais vitais' },
    points,
    indicators: buildIndicators(points),
  };
}

function renderCard(item) {
  render(
    <ThemeProvider theme={theme}>
      <EvolutionSeriesCard series={item} />
    </ThemeProvider>,
  );
}

describe('EvolutionSeriesCard', () => {
  it('não mostra indicador como calculado quando a API diz que não foi', () => {
    renderCard(series([110]));

    expect(screen.queryByText(content.directions.rising('0'))).toBeNull();
  });

  it('mostra o parâmetro com a unidade, o formulário e o gráfico com nome acessível', () => {
    renderCard(series([105, 98, 142]));

    expect(screen.getByText('Glicemia capilar (mg/dL)')).toBeInTheDocument();
    expect(screen.getByText('Sinais vitais')).toBeInTheDocument();
    expect(
      screen.getByRole('figure', {
        name: content.chartLabel('Glicemia capilar'),
      }),
    ).toBeInTheDocument();
  });

  it('mostra média, variação e tendência calculadas', () => {
    renderCard(series([105, 98, 142]));

    expect(screen.getByText(content.mean)).toBeInTheDocument();
    expect(screen.getByText('115 mg/dL')).toBeInTheDocument();
    expect(screen.getByText('37 mg/dL')).toBeInTheDocument();
    expect(
      screen.getByText(content.directions.rising('6,17')),
    ).toBeInTheDocument();
  });

  it('diz quais indicadores não puderam ser calculados e por quê', () => {
    renderCard(series([110]));

    expect(
      screen.getByText(
        content.unavailable({
          reason: 'INSUFFICIENT_SAMPLES',
          minimumSamples: 2,
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        content.unavailable({
          reason: 'INSUFFICIENT_SAMPLES',
          minimumSamples: 3,
        }),
      ),
    ).toBeInTheDocument();
  });
});

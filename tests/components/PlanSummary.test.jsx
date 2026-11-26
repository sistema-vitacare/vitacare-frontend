import { ThemeProvider } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlanSummary from '../../src/components/PlanSummary.jsx';
import {
  planFeatureLabels,
  planSummaryContent as content,
} from '../../src/data/planSummary.js';
import { theme } from '../../src/styles/theme.js';
import { ENTERPRISE } from '../support/fixtures/organizations.js';

const plan = (overrides = {}) => ({
  organizationId: '6ac48ac1-6fb6-5621-b4f5-dc00e6b1df3d',
  plan: ENTERPRISE,
  term: {
    startsAt: '2026-09-02T13:20:00.000Z',
    endsAt: null,
    status: 'active',
  },
  limits: { users: 50, patients: 1000 },
  usage: { users: 11, patients: 22 },
  ...overrides,
});

function renderSummary(data, meta = {}) {
  render(
    <ThemeProvider theme={theme}>
      <PlanSummary data={data} meta={meta} />
    </ThemeProvider>,
  );
}

describe('PlanSummary', () => {
  it('mostra o plano com descrição, recursos do Quadro 2, vigência e uso', () => {
    renderSummary(plan());

    expect(screen.getByText(ENTERPRISE.name)).toBeInTheDocument();
    expect(screen.getByText(ENTERPRISE.description)).toBeInTheDocument();
    const features = screen.getByRole('list', { name: content.featuresLabel });
    expect(within(features).getAllByRole('listitem')).toHaveLength(
      ENTERPRISE.features.length,
    );
    expect(features).toHaveTextContent(planFeatureLabels.management_reports);
    expect(
      screen.getByText(content.term('02/09/2026', null)),
    ).toBeInTheDocument();
    const usage = screen.getByRole('list', { name: content.usageLabel });
    expect(usage).toHaveTextContent(content.usageValue('11', '50'));
    expect(usage).toHaveTextContent(content.usageValue('22', '1.000'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra o fim da vigência no dia de Brasília e o aviso que a API manda', () => {
    renderSummary(
      plan({
        term: {
          startsAt: '2026-09-02T13:20:00.000Z',
          endsAt: '2026-11-21T02:59:59.999Z',
          status: 'active',
        },
      }),
      { message: 'O plano vence em 20/11/2026 às 23:59.' },
    );

    expect(
      screen.getByText(content.term('02/09/2026', '20/11/2026')),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O plano vence em 20/11/2026 às 23:59.',
    );
  });

  it('marca a vigência vencida', () => {
    renderSummary(
      plan({
        term: {
          startsAt: '2026-09-02T13:20:00.000Z',
          endsAt: '2026-11-10T02:59:59.999Z',
          status: 'expired',
        },
      }),
    );

    expect(screen.getByText(content.expired)).toBeInTheDocument();
  });
});

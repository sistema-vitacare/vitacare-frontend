import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  alertPath,
  dashboardIndicatorPath,
  recordPath,
} from '../../../src/constants/routes.js';
import { dashboardContent as content } from '../../../src/data/dashboardPages.js';
import { resourceStateContent } from '../../../src/data/patientFields.js';
import DashboardPage from '../../../src/pages/Dashboard/DashboardPage.jsx';
import { todayInSaoPaulo } from '../../../src/utils/format.js';
import { shortcutPeriod } from '../../../src/utils/period.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const SUMMARY = 'GET /dashboard';
const PLAN_MESSAGE =
  'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.';

// Resumo no formato do exemplo de `dashboard-resumo.md`.
function summary({ from, to }, followUps = 340) {
  return {
    period: { from, to, timeZone: 'America/Sao_Paulo' },
    previousPeriod: { from: '2026-08-31', to: '2026-09-30' },
    patients: { active: 128, newInPeriod: 12 },
    users: { active: 23 },
    followUps: {
      inPeriod: followUps,
      previousPeriodTotal: 335,
      change: followUps - 335,
      byDay: [
        { date: from, total: followUps },
        { date: to, total: 0 },
      ],
    },
    alerts: {
      issuedInPeriod: 41,
      previousPeriodTotal: 38,
      change: 3,
      pending: 7,
    },
    priorityAlerts: [
      {
        id: 'a1e70000-0000-5000-8009-000000000001',
        patient: { id: 'p1', name: 'Paciente Exemplo' },
        source: 'reading',
        severity: 'critical',
        title: 'Saturação abaixo da referência',
        generatedAt: '2026-10-31T13:46:00.000Z',
        reading: {
          fieldName: 'Saturação de oxigênio',
          fieldUnit: '%',
          value: '91',
          operator: 'lt',
          referenceValue: 94,
          author: { id: 'u1', name: 'Cuidador Exemplo' },
        },
      },
      {
        id: 'a1e70000-0000-5000-8009-000000000002',
        patient: { id: 'p2', name: 'Paciente Dois' },
        source: 'absence',
        severity: 'warning',
        title: 'Ausência de registro',
        generatedAt: '2026-10-31T12:00:00.000Z',
        reading: null,
      },
    ],
    latestFollowUps: [
      {
        id: 'f0110000-0000-5000-8000-000000000001',
        patient: { id: 'p1', name: 'Paciente Exemplo' },
        form: { id: 'form-1', name: 'Sinais vitais' },
        author: { id: 'u1', name: 'Cuidador Exemplo' },
        visitedAt: '2026-10-31T13:40:00.000Z',
      },
    ],
  };
}

function answerSummary() {
  apiStub().use({
    [SUMMARY]: ({ query }) => ({
      data: summary(query, query.from === period('7').from ? 70 : 340),
      meta: {},
    }),
  });
}

const period = (shortcut) => shortcutPeriod(shortcut, todayInSaoPaulo());

function renderDashboard(path = PATHS.DASHBOARD, width) {
  return renderPage([{ path: PATHS.DASHBOARD, element: <DashboardPage /> }], {
    profile: 'admin',
    path,
    width,
  });
}

const indicators = () =>
  within(screen.getByRole('list', { name: content.indicatorsLabel }));

const followUpsIndicator = () =>
  indicators().getByRole('link', {
    name: new RegExp(content.indicators.followUps.label),
  });

afterEach(() => {
  resetViewport();
});

describe('DashboardPage', () => {
  it('mostra os quatro indicadores dos últimos 30 dias, cada um levando ao detalhe', async () => {
    answerSummary();
    const router = renderDashboard();

    await screen.findByRole('list', { name: content.indicatorsLabel });
    const patients = indicators().getByRole('link', {
      name: new RegExp(content.indicators.patients.label),
    });

    expect(patients).toHaveTextContent('128');
    expect(patients).toHaveAttribute(
      'href',
      dashboardIndicatorPath('patients', '30'),
    );
    expect(followUpsIndicator()).toHaveTextContent('340');
    expect(indicators().getAllByRole('link')).toHaveLength(4);
    expect(router.state.location.search).toBe('');
    expect(apiStub().last(SUMMARY).query).toEqual(period('30'));
  });

  it('troca o período pelo atalho, guarda no endereço e pede o período novo', async () => {
    answerSummary();
    const router = renderDashboard();
    await screen.findByRole('list', { name: content.indicatorsLabel });

    fireEvent.click(
      screen.getByRole('button', { name: content.shortcuts['7'] }),
    );

    await waitFor(() => expect(followUpsIndicator()).toHaveTextContent('70'));
    expect(apiStub().last(SUMMARY).query).toEqual(period('7'));
    expect(router.state.location.search).toBe('?periodo=7');
    expect(
      screen.getByRole('button', { name: content.shortcuts['7'] }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra o gráfico de registros por dia, os alertas prioritários e os últimos registros', async () => {
    answerSummary();
    renderDashboard();

    expect(
      await screen.findByRole('figure', { name: content.chart.label }),
    ).toBeInTheDocument();
    const alerts = screen.getByRole('list', { name: content.priority.title });
    const records = screen.getByRole('list', { name: content.latest.title });
    const [firstAlert] = within(alerts).getAllByRole('link');
    const [firstRecord] = within(records).getAllByRole('link');

    expect(within(alerts).getAllByRole('link')).toHaveLength(2);
    expect(firstAlert).toHaveAttribute(
      'href',
      alertPath('a1e70000-0000-5000-8009-000000000001'),
    );
    expect(firstAlert).toHaveTextContent('Paciente Exemplo');
    expect(firstRecord).toHaveAttribute(
      'href',
      recordPath('f0110000-0000-5000-8000-000000000001'),
    );
  });

  it('no período sem registro, mostra os números zerados e a mensagem da API', async () => {
    const message = 'Nenhum registro de acompanhamento no período selecionado.';
    apiStub().use({
      [SUMMARY]: ({ query }) => ({
        data: summary(query, 0),
        meta: { message },
      }),
    });

    renderDashboard(`${PATHS.DASHBOARD}?periodo=today`);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(followUpsIndicator()).toHaveTextContent('0');
    expect(apiStub().last(SUMMARY).query).toEqual(period('today'));
  });

  it('mostra o erro com nova tentativa quando a carga falha', async () => {
    answerSummary();
    apiStub().fail(SUMMARY);
    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', { name: resourceStateContent.retry }),
    );

    expect(
      await screen.findByRole('list', { name: content.indicatorsLabel }),
    ).toBeInTheDocument();
  });

  it('no Enterprise, não mostra o aviso de plano nem o link para ele', async () => {
    answerSummary();
    renderDashboard();

    await screen.findByRole('list', { name: content.indicatorsLabel });
    expect(
      screen.queryByRole('link', { name: content.plan.action }),
    ).toBeNull();
  });

  it('no plano sem o painel, mostra a mensagem da API e leva às configurações', async () => {
    apiStub().use({
      [SUMMARY]: () =>
        apiFailure(403, 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE', PLAN_MESSAGE),
    });

    renderDashboard();

    expect(await screen.findByText(PLAN_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.plan.action }),
    ).toHaveAttribute('href', PATHS.SETTINGS);
    expect(
      screen.queryByRole('list', { name: content.indicatorsLabel }),
    ).toBeNull();
  });
});

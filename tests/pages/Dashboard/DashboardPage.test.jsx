import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  alertPath,
  dashboardIndicatorPath,
  recordPath,
} from '../../../src/constants/routes.js';
import { dashboardContent as content } from '../../../src/data/dashboardPages.js';
import { organization } from '../../../src/data/mocks/organization.js';
import { resourceStateContent } from '../../../src/data/patientFields.js';
import { BASIC_PLAN } from '../../../src/data/mocks/plans.js';
import DashboardPage from '../../../src/pages/Dashboard/DashboardPage.jsx';
import { getDashboard } from '../../../src/services/dashboardService.js';
import {
  allFollowUps,
  annulFollowUp,
} from '../../../src/services/followUpStore.js';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { changeTerm } from '../../../src/services/organizationStore.js';
import { todayInSaoPaulo } from '../../../src/utils/format.js';
import { shortcutPeriod } from '../../../src/utils/period.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

function renderDashboard(path = PATHS.DASHBOARD, width) {
  return renderPage([{ path: PATHS.DASHBOARD, element: <DashboardPage /> }], {
    profile: 'admin',
    path,
    width,
  });
}

const indicators = () =>
  within(screen.getByRole('list', { name: content.indicatorsLabel }));

async function expected(shortcut) {
  return (await getDashboard(shortcutPeriod(shortcut, todayInSaoPaulo()))).data;
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('DashboardPage', () => {
  it('mostra os quatro indicadores dos últimos 30 dias, cada um levando ao detalhe', async () => {
    const router = renderDashboard();

    await screen.findByRole('list', { name: content.indicatorsLabel });
    const data = await expected('30');
    const patients = indicators().getByRole('link', {
      name: new RegExp(content.indicators.patients.label),
    });

    expect(patients).toHaveTextContent(String(data.patients.active));
    expect(patients).toHaveAttribute(
      'href',
      dashboardIndicatorPath('patients', '30'),
    );
    expect(
      indicators().getByRole('link', {
        name: new RegExp(content.indicators.followUps.label),
      }),
    ).toHaveTextContent(String(data.followUps.inPeriod));
    expect(indicators().getAllByRole('link')).toHaveLength(4);
    expect(router.state.location.search).toBe('');
  });

  it('troca o período pelo atalho, guarda no endereço e atualiza os números', async () => {
    const router = renderDashboard();
    await screen.findByRole('list', { name: content.indicatorsLabel });

    fireEvent.click(
      screen.getByRole('button', { name: content.shortcuts['7'] }),
    );

    const data = await expected('7');
    await waitFor(() =>
      expect(
        indicators().getByRole('link', {
          name: new RegExp(content.indicators.followUps.label),
        }),
      ).toHaveTextContent(String(data.followUps.inPeriod)),
    );
    expect(router.state.location.search).toBe('?periodo=7');
    expect(
      screen.getByRole('button', { name: content.shortcuts['7'] }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra o gráfico de registros por dia, os alertas prioritários e os últimos registros', async () => {
    renderDashboard();

    expect(
      await screen.findByRole('figure', { name: content.chart.label }),
    ).toBeInTheDocument();
    const data = await expected('30');
    const alerts = screen.getByRole('list', { name: content.priority.title });
    const records = screen.getByRole('list', { name: content.latest.title });
    const [firstAlert] = within(alerts).getAllByRole('link');
    const [firstRecord] = within(records).getAllByRole('link');

    expect(within(alerts).getAllByRole('link')).toHaveLength(
      data.priorityAlerts.length,
    );
    expect(firstAlert).toHaveAttribute(
      'href',
      alertPath(data.priorityAlerts[0].id),
    );
    expect(firstAlert).toHaveTextContent(data.priorityAlerts[0].patient.name);
    expect(firstRecord).toHaveAttribute(
      'href',
      recordPath(data.latestFollowUps[0].id),
    );
  });

  it('no período sem registro, mostra os números zerados e a mensagem da API', async () => {
    const today = todayInSaoPaulo();
    for (const item of allFollowUps()) {
      if (todayInSaoPaulo(new Date(item.visitedAt)) === today) {
        annulFollowUp(item.id, {
          reason: 'Teste',
          annulledAt: new Date().toISOString(),
          annulledBy: { id: 'x', name: 'X' },
        });
      }
    }

    renderDashboard(`${PATHS.DASHBOARD}?periodo=today`);

    expect(
      await screen.findByText(
        'Nenhum registro de acompanhamento no período selecionado.',
      ),
    ).toBeInTheDocument();
    expect(
      indicators().getByRole('link', {
        name: new RegExp(content.indicators.followUps.label),
      }),
    ).toHaveTextContent('0');
  });

  it('mostra o erro com nova tentativa quando a carga falha', async () => {
    renderDashboard();
    await screen.findByRole('list', { name: content.indicatorsLabel });

    failNextRequest();
    fireEvent.click(
      screen.getByRole('button', { name: content.shortcuts['90'] }),
    );

    const retry = await screen.findByRole('button', {
      name: resourceStateContent.retry,
    });
    fireEvent.click(retry);

    expect(
      await screen.findByRole('list', { name: content.indicatorsLabel }),
    ).toBeInTheDocument();
  });

  it('no Enterprise, não mostra o aviso de plano nem o link para ele', async () => {
    renderDashboard();

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: content.plan.action }),
      ).toBeNull(),
    );
  });

  it('no plano sem o painel, explica e leva às configurações', async () => {
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    renderDashboard();

    expect(
      await screen.findByText(
        'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.plan.action }),
    ).toHaveAttribute('href', PATHS.SETTINGS);
    expect(
      screen.queryByRole('list', { name: content.indicatorsLabel }),
    ).toBeNull();
  });
});

import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  dashboardIndicatorPath,
  dashboardPath,
} from '../../../src/constants/routes.js';
import { dashboardIndicatorContent as content } from '../../../src/data/dashboardPages.js';
import DashboardIndicatorPage from '../../../src/pages/Dashboard/DashboardIndicatorPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

function renderIndicator(path) {
  return renderPage(
    [
      {
        path: PATHS.DASHBOARD_INDICATOR,
        element: <DashboardIndicatorPage />,
      },
    ],
    { profile: 'admin', path },
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('DashboardIndicatorPage', () => {
  it('recusa indicador que não existe', async () => {
    renderIndicator('/painel/medicamentos');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });

  it('mostra os pacientes ativos por profissional responsável e volta ao painel no mesmo período', async () => {
    renderIndicator(dashboardIndicatorPath('patients', '7'));

    const table = await screen.findByRole('table', {
      name: content.patients.byResponsible,
    });

    expect(within(table).getByText('Rafael Moura Brandão')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.backToDashboard }),
    ).toHaveAttribute('href', dashboardPath('7'));
    expect(
      screen.getByRole('link', { name: content.patients.areaLink }),
    ).toHaveAttribute('href', PATHS.PATIENTS);
  });

  it('mostra os usuários por perfil e situação, sem período', async () => {
    renderIndicator(dashboardIndicatorPath('users', '30'));

    const table = await screen.findByRole('table', {
      name: content.users.byProfile,
    });

    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(
      screen.queryByRole('group', { name: content.shortcutsLabel }),
    ).toBeNull();
  });

  it('mostra os registros por formulário e por autor', async () => {
    renderIndicator(dashboardIndicatorPath('followUps', '30'));

    expect(
      await screen.findByRole('table', { name: content.followUps.byForm }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: content.followUps.byAuthor }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: content.followUps.chartLabel }),
    ).toBeInTheDocument();
  });

  it('mostra os alertas emitidos por severidade e origem e os pendentes', async () => {
    renderIndicator(dashboardIndicatorPath('alerts', '30'));

    const bySeverity = await screen.findByRole('table', {
      name: content.alerts.bySeverity,
    });

    expect(within(bySeverity).getAllByRole('row')).toHaveLength(4);
    expect(
      screen.getByRole('table', { name: content.alerts.bySource }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: content.alerts.pending }),
    ).toBeInTheDocument();
  });
});

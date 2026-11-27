import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  dashboardIndicatorPath,
  dashboardPath,
} from '../../../src/constants/routes.js';
import {
  dashboardContent,
  dashboardIndicatorContent as content,
} from '../../../src/data/dashboardPages.js';
import DashboardIndicatorPage from '../../../src/pages/Dashboard/DashboardIndicatorPage.jsx';
import { todayInSaoPaulo } from '../../../src/utils/format.js';
import { shortcutPeriod } from '../../../src/utils/period.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const PERIOD_FIELDS = { timeZone: 'America/Sao_Paulo' };

// Respostas no formato dos exemplos de `dashboard-*.md`.
const ANSWERS = {
  'GET /dashboard/patients': ({ query }) => ({
    data: {
      period: { ...query, ...PERIOD_FIELDS },
      active: 128,
      inactive: 9,
      newInPeriod: 12,
      byResponsible: [
        {
          professional: { id: 'u1', name: 'Profissional Exemplo' },
          active: 80,
        },
        { professional: { id: 'u2', name: 'Profissional Dois' }, active: 48 },
      ],
    },
    meta: {},
  }),
  'GET /dashboard/users': () => ({
    data: {
      active: 23,
      pending: 2,
      inactive: 4,
      byProfile: [
        ['admin', 'Administrador', 2, 0, 0],
        ['professional', 'Profissional de saude', 6, 1, 1],
        ['caregiver', 'Cuidador', 12, 1, 2],
        ['family', 'Familiar', 3, 0, 1],
      ].map(([code, name, active, pending, inactive]) => ({
        profile: { code, name },
        active,
        pending,
        inactive,
      })),
    },
    meta: {},
  }),
  'GET /dashboard/follow-ups': ({ query }) => ({
    data: {
      period: { ...query, ...PERIOD_FIELDS },
      previousPeriod: { from: '2026-08-31', to: '2026-09-30' },
      inPeriod: 340,
      previousPeriodTotal: 335,
      change: 5,
      byDay: [{ date: query.from, total: 11 }],
      byForm: [{ form: { id: 'f1', name: 'Sinais vitais' }, total: 210 }],
      byAuthor: [{ user: { id: 'u3', name: 'Cuidador Exemplo' }, total: 190 }],
    },
    meta: {},
  }),
  'GET /dashboard/alerts': ({ query }) => ({
    data: {
      period: { ...query, ...PERIOD_FIELDS },
      previousPeriod: { from: '2026-08-31', to: '2026-09-30' },
      issuedInPeriod: 41,
      previousPeriodTotal: 38,
      change: 3,
      byDay: [{ date: query.from, total: 2 }],
      bySeverity: { critical: 6, warning: 20, info: 15 },
      bySource: { reading: 18, absence: 8, medication_reminder: 15 },
      issuedStillOpen: 5,
      pending: { total: 7, bySeverity: { critical: 2, warning: 4, info: 1 } },
    },
    meta: {},
  }),
};

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
  resetViewport();
});

describe('DashboardIndicatorPage', () => {
  it('recusa indicador que não existe', async () => {
    renderIndicator('/painel/medicamentos');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });

  it('mostra os pacientes ativos por profissional responsável e volta ao painel no mesmo período', async () => {
    apiStub().use(ANSWERS);
    renderIndicator(dashboardIndicatorPath('patients', '7'));

    const table = await screen.findByRole('table', {
      name: content.patients.byResponsible,
    });

    expect(within(table).getByText('Profissional Exemplo')).toBeInTheDocument();
    expect(apiStub().last('GET /dashboard/patients').query).toEqual(
      shortcutPeriod('7', todayInSaoPaulo()),
    );
    expect(
      screen.getByRole('link', { name: content.backToDashboard }),
    ).toHaveAttribute('href', dashboardPath('7'));
    expect(
      screen.getByRole('link', { name: content.patients.areaLink }),
    ).toHaveAttribute('href', PATHS.PATIENTS);
  });

  it('mostra os usuários por perfil e situação, sem período', async () => {
    apiStub().use(ANSWERS);
    renderIndicator(dashboardIndicatorPath('users', '30'));

    const table = await screen.findByRole('table', {
      name: content.users.byProfile,
    });

    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(apiStub().last('GET /dashboard/users').query).toEqual({});
    expect(
      screen.queryByRole('group', { name: content.shortcutsLabel }),
    ).toBeNull();
  });

  // Em 360 px a tabela rola de lado; a região recebe o foco para quem rola
  // pelo teclado.
  it('põe cada tabela numa região com o nome dela, que recebe foco pelo teclado', async () => {
    apiStub().use(ANSWERS);
    renderIndicator(dashboardIndicatorPath('users', '30'));

    const region = await screen.findByRole('region', {
      name: content.users.byProfile,
    });

    expect(region).toHaveAttribute('tabindex', '0');
    expect(
      within(region).getByRole('table', { name: content.users.byProfile }),
    ).toBeInTheDocument();
  });

  it('mostra os registros por formulário e por autor', async () => {
    apiStub().use(ANSWERS);
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
    apiStub().use(ANSWERS);
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

  it('no plano sem o painel, mostra a mensagem da API e leva às configurações', async () => {
    const message =
      'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.';
    apiStub().use({
      'GET /dashboard/alerts': () =>
        apiFailure(403, 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE', message),
    });
    renderIndicator(dashboardIndicatorPath('alerts', '30'));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: dashboardContent.plan.action }),
    ).toHaveAttribute('href', PATHS.SETTINGS);
  });
});

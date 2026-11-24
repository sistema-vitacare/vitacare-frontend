import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import {
  alertsReportContent as alertsContent,
  caregiversReportContent as caregiversContent,
  managementReportContent as reportContent,
  recentReportsContent as recentContent,
  reportsPageContent as content,
} from '../../../src/data/managementReports.js';
import { patientReportContent } from '../../../src/data/patientReport.js';
import ReportsPage from '../../../src/pages/Reports/ReportsPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import {
  apiFailure,
  apiFile,
  apiPage,
  apiStub,
} from '../../support/apiStub.js';
import { patientRoutes } from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const CATALOG = 'GET /management-reports';
const PLAN_MESSAGE =
  'Os relatórios gerenciais fazem parte do plano Enterprise. Solicite a mudança de plano para acessá-los.';
const PERIOD = {
  from: '2026-10-15',
  to: '2026-11-13',
  timeZone: 'America/Sao_Paulo',
};
const ORGANIZATION = { id: 'org-1', name: 'Residencial Ipê Amarelo' };

// Catálogo e recentes no formato de `management-reports-catalogo.md` e
// `management-reports-recentes.md`; cada PDF exportado entra nos dois, como
// a API grava a exportação.
function managementApi() {
  const exports = { patient_follow_up: 1, alerts: 2, caregiver_activity: 1 };
  const recent = [
    {
      id: 'r1',
      type: 'alerts',
      scope: { kind: 'condition', patient: null, condition: 'Diabetes' },
      period: { from: '2026-10-01', to: '2026-10-31' },
      format: 'pdf',
      generatedBy: { id: 'u0', name: 'Helena Vasconcelos' },
      generatedAt: '2026-11-12T12:40:00.000Z',
    },
  ];
  const type = (code, name, path) => ({
    type: code,
    name,
    description: `Descrição de ${name}.`,
    path,
    pdfPath: `${path}/pdf`,
    formats: ['pdf'],
    exportCount: exports[code],
  });
  return {
    [CATALOG]: () => ({
      data: [
        type(
          'patient_follow_up',
          'Acompanhamento individual',
          '/patients/{patientId}/report',
        ),
        type(
          'alerts',
          'Alertas e intercorrências',
          '/management-reports/alerts',
        ),
        type(
          'caregiver_activity',
          'Atividade dos cuidadores',
          '/management-reports/caregivers',
        ),
      ],
      meta: {},
    }),
    'GET /management-reports/recent': () => apiPage(recent, { limit: 5 }),
    'GET /management-reports/alerts': ({ query }) =>
      query.condition === 'inexistente'
        ? {
            data: alertsReport(query, 0),
            meta: { message: 'Nenhum alerta emitido no período selecionado.' },
          }
        : { data: alertsReport(query, 1), meta: {} },
    'GET /management-reports/caregivers': ({ query }) => ({
      data: caregiversReport(query),
      meta: {},
    }),
    'GET /management-reports/alerts/pdf': ({ query }) => {
      exports.alerts += 1;
      recent.unshift({
        id: `r${recent.length + 1}`,
        type: 'alerts',
        scope: { kind: 'organization', patient: null, condition: null },
        period: { from: query.from, to: query.to },
        format: 'pdf',
        generatedBy: { id: 'u0', name: 'Helena Vasconcelos' },
        generatedAt: '2026-11-13T15:00:00.000Z',
      });
      return apiFile('%PDF-1.4', {
        fileName: `relatorio-alertas-${query.from}-a-${query.to}.pdf`,
        type: 'application/pdf',
      });
    },
  };
}

// No formato do exemplo de `management-reports-alertas.md`.
function alertsReport(query, total) {
  const bySeverity = (count) => ({ total: count, open: 0, resolved: count });
  return {
    period: PERIOD,
    condition: query.condition ?? null,
    generatedAt: '2026-11-13T15:00:00.000Z',
    organization: ORGANIZATION,
    totals: { issued: total, open: 0, resolved: total, intercurrences: total },
    bySource: {
      reading: bySeverity(total),
      absence: bySeverity(0),
      medicationReminder: bySeverity(0),
    },
    bySeverity: {
      critical: bySeverity(total),
      warning: bySeverity(0),
      info: bySeverity(0),
    },
    resolution: {
      overall: {
        resolved: total,
        averageHours: total ? 2 : null,
        medianHours: total ? 2 : null,
      },
      bySeverity: {
        critical: {
          resolved: total,
          averageHours: total ? 2 : null,
          medianHours: total ? 2 : null,
        },
        warning: { resolved: 0, averageHours: null, medianHours: null },
        info: { resolved: 0, averageHours: null, medianHours: null },
      },
    },
    topPatients: total
      ? [
          {
            patient: {
              id: 'p1',
              name: 'Dirce Albuquerque Moraes',
              status: 'active',
            },
            total,
            intercurrences: total,
            open: 0,
          },
        ]
      : [],
    byDay: [{ date: '2026-11-05', total, intercurrences: total }],
    intercurrences: total
      ? [
          {
            id: 'a1',
            generatedAt: '2026-11-05T12:00:00.000Z',
            source: 'reading',
            patient: { id: 'p1', name: 'Dirce Albuquerque Moraes' },
            subject: 'Glicemia',
            status: 'resolved',
            resolvedAt: '2026-11-05T14:00:00.000Z',
            hoursToResolve: 2,
          },
        ]
      : [],
    intercurrencesTruncated: false,
  };
}

// No formato do exemplo de `management-reports-cuidadores.md`.
function caregiversReport(query) {
  return {
    period: PERIOD,
    condition: query.condition ?? null,
    generatedAt: '2026-11-13T15:00:00.000Z',
    organization: ORGANIZATION,
    summary: {
      caregivers: 1,
      linkedPatients: 3,
      validFollowUps: 2,
      annulledFollowUps: 1,
      absenceAlerts: 2,
      resolvedAlerts: 2,
    },
    caregivers: [
      {
        caregiver: {
          id: 'u3',
          name: 'Rosângela Prado',
          status: 'active',
          profile: 'caregiver',
        },
        linkedPatients: 3,
        validFollowUps: 2,
        annulledFollowUps: 1,
        patientsWithFollowUp: 1,
        patientsWithoutFollowUp: 2,
        absenceAlerts: 2,
        resolvedAlerts: 2,
      },
    ],
  };
}

function renderReports(profile = 'admin', path = PATHS.REPORTS) {
  return renderPage([{ path: PATHS.REPORTS, element: <ReportsPage /> }], {
    profile,
    path,
  });
}

const typeCard = (name) => screen.getByRole('link', { name: new RegExp(name) });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // A escolha do paciente lê a API (Bloco 10).
  apiStub().use(patientRoutes());
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

describe('ReportsPage', () => {
  it('mostra ao profissional só o relatório do paciente, sem pedir o catálogo', async () => {
    renderReports('professional');

    expect(
      await screen.findByText(patientReportContent.picker.choosePatient),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Alertas e intercorrências/ }),
    ).toBeNull();
    expect(apiStub().last(CATALOG)).toBeUndefined();
  });

  it('mostra ao administrador os três tipos, com os gerados, e o do paciente como padrão', async () => {
    apiStub().use(managementApi());
    renderReports();

    expect(
      await screen.findByRole('link', { name: /Acompanhamento individual/ }),
    ).toHaveTextContent(content.exported(1));
    expect(typeCard('Alertas e intercorrências')).toHaveTextContent(
      content.exported(2),
    );
    expect(typeCard('Atividade dos cuidadores')).toHaveTextContent(
      content.exported(1),
    );
    expect(
      screen.getByText(patientReportContent.picker.choosePatient),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: recentContent.title }),
    ).toBeInTheDocument();
  });

  it('troca o tipo pelo endereço e mostra o relatório de alertas', async () => {
    apiStub().use(managementApi());
    const router = renderReports();
    fireEvent.click(
      await screen.findByRole('link', { name: /Alertas e intercorrências/ }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toContain('tipo=alertas'),
    );
    const totals = await screen.findByRole('region', {
      name: alertsContent.totalsLabel,
    });
    expect(
      within(totals).getByText(alertsContent.totals.intercurrences),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: alertsContent.intercurrencesTitle }),
    ).toBeInTheDocument();
  });

  it('filtra pela condição e mostra a mensagem da API quando não há alerta', async () => {
    apiStub().use(managementApi());
    renderReports(
      'admin',
      `${PATHS.REPORTS}?tipo=alertas&condicao=inexistente`,
    );

    expect(
      await screen.findByText('Nenhum alerta emitido no período selecionado.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(reportContent.condition('inexistente')),
    ).toBeInTheDocument();
    expect(apiStub().last('GET /management-reports/alerts').query).toEqual({
      condition: 'inexistente',
    });
  });

  it('mostra a atividade dos cuidadores, sem nota', async () => {
    apiStub().use(managementApi());
    renderReports('admin', `${PATHS.REPORTS}?tipo=cuidadores`);

    expect(
      await screen.findByText(caregiversContent.noRanking),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Rosângela Prado').length).toBeGreaterThan(0);
  });

  it('põe a tabela dos cuidadores numa região que recebe foco pelo teclado', async () => {
    apiStub().use(managementApi());
    renderReports('admin', `${PATHS.REPORTS}?tipo=cuidadores`);

    const region = await screen.findByRole('region', {
      name: caregiversContent.summary.caregivers,
    });

    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });

  it('exporta o PDF gerencial e recarrega os gerados e os recentes da API', async () => {
    apiStub().use(managementApi());
    URL.createObjectURL = vi.fn(() => 'blob:relatorio');
    URL.revokeObjectURL = vi.fn();
    const names = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function record() {
        names.push(this.download);
      },
    );
    renderReports(
      'admin',
      `${PATHS.REPORTS}?tipo=alertas&de=2026-11-01&ate=2026-11-10`,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: reportContent.exportPdf }),
    );

    await waitFor(() =>
      expect(names).toEqual(['relatorio-alertas-2026-11-01-a-2026-11-10.pdf']),
    );
    await waitFor(() =>
      expect(typeCard('Alertas e intercorrências')).toHaveTextContent(
        content.exported(3),
      ),
    );
    await waitFor(() => {
      const recent = screen
        .getByRole('heading', { name: recentContent.title })
        .closest('.MuiCard-root');
      const [first] = within(recent).getAllByRole('listitem');
      expect(first).toHaveTextContent(
        recentContent.period('01/11/2026', '10/11/2026'),
      );
    });
  });

  it('gera de novo com o mesmo tipo, escopo e período', async () => {
    apiStub().use(managementApi());
    const router = renderReports();
    const recent = (
      await screen.findByRole('heading', { name: recentContent.title })
    ).closest('.MuiCard-root');
    const row = (
      await within(recent).findByText(
        new RegExp(recentContent.scope.condition('Diabetes')),
      )
    ).closest('li');

    fireEvent.click(
      within(row).getByRole('button', { name: recentContent.again }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toContain('tipo=alertas'),
    );
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('condicao')).toBe('Diabetes');
    expect(params.get('de')).toBe('2026-10-01');
    expect(params.get('ate')).toBe('2026-10-31');
  });

  it('no plano sem o recurso, mostra a mensagem da API e o relatório do paciente', async () => {
    apiStub().use({
      [CATALOG]: () =>
        apiFailure(
          403,
          'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE',
          PLAN_MESSAGE,
        ),
    });
    renderReports();

    expect(await screen.findByText(PLAN_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByText(patientReportContent.picker.choosePatient),
    ).toBeInTheDocument();
  });
});

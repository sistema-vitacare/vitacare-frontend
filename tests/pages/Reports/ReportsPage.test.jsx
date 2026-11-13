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
import { organization } from '../../../src/data/mocks/organization.js';
import { BASIC_PLAN } from '../../../src/data/mocks/plans.js';
import { patientReportContent } from '../../../src/data/patientReport.js';
import ReportsPage from '../../../src/pages/Reports/ReportsPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { changeTerm } from '../../../src/services/organizationStore.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');

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
  it('mostra ao profissional só o relatório do paciente', async () => {
    renderReports('professional');

    expect(
      await screen.findByText(patientReportContent.picker.choosePatient),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Alertas e intercorrências/ }),
    ).toBeNull();
  });

  it('mostra ao administrador os três tipos, com os gerados, e o do paciente como padrão', async () => {
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
  });

  it('mostra a atividade dos cuidadores, sem nota', async () => {
    renderReports('admin', `${PATHS.REPORTS}?tipo=cuidadores`);

    expect(
      await screen.findByText(caregiversContent.noRanking),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Rosângela Prado').length).toBeGreaterThan(0);
  });

  it('exporta o PDF gerencial, que entra no topo dos recentes e soma no tipo', async () => {
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
    // Os recentes recarregam depois da exportação.
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
    expect(params.get('de')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.get('ate')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no plano sem o recurso, mostra a mensagem da API e o relatório do paciente', async () => {
    changeTerm(organization.id, { planId: BASIC_PLAN.id });
    renderReports();

    expect(
      await screen.findByText(
        'Os relatórios gerenciais fazem parte do plano Enterprise. Solicite a mudança de plano para acessá-los.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(patientReportContent.picker.choosePatient),
    ).toBeInTheDocument();
  });
});

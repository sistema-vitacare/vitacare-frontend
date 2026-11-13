import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, reportsPath } from '../../../src/constants/routes.js';
import { evolutionSeriesContent } from '../../../src/data/evolutionSeries.js';
import { patientReportContent as content } from '../../../src/data/patientReport.js';
import { periodFieldsContent } from '../../../src/data/periodFields.js';
import PatientReport from '../../../src/pages/Reports/PatientReport.jsx';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { getPatientReport } from '../../../src/services/reportService.js';
import { formatDate, todayInSaoPaulo } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const NOW = new Date('2026-11-13T15:00:00.000Z');

function renderReport(path = reportsPath(DIRCE)) {
  return renderPage([{ path: PATHS.REPORTS, element: <PatientReport /> }], {
    profile: 'professional',
    path,
  });
}

function section(title) {
  return screen.getByRole('heading', { name: title }).closest('.MuiCard-root');
}

function stubDownloads() {
  URL.createObjectURL = vi.fn(() => 'blob:relatorio');
  URL.revokeObjectURL = vi.fn();
  const names = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function record() {
      names.push(this.download);
    },
  );
  return names;
}

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

describe('PatientReport', () => {
  it('pede o paciente antes de gerar o relatório', async () => {
    renderReport(PATHS.REPORTS);

    expect(
      await screen.findByText(content.picker.choosePatient),
    ).toBeInTheDocument();
  });

  // Como na API, o relatório não traz CPF nem contato do paciente.
  it('não mostra CPF nem telefone do paciente', async () => {
    renderReport();
    await screen.findByRole('heading', { name: 'Dirce Albuquerque Moraes' });

    expect(screen.queryByText(/\d{3}\.\d{3}\.\d{3}-\d{2}/)).toBeNull();
    expect(screen.queryByText(/\(\d{2}\) \d{4,5}-\d{4}/)).toBeNull();
  });

  it('mostra identificação, resumo, evolução, registros e medicamentos no período padrão', async () => {
    renderReport();
    const { data } = await getPatientReport(DIRCE);

    expect(
      await screen.findByText(
        content.period(
          formatDate(data.period.from),
          formatDate(data.period.to),
        ),
      ),
    ).toBeInTheDocument();
    const identification = section(content.identification.title);
    expect(
      within(identification).getByText('Hipertensão arterial'),
    ).toBeInTheDocument();
    expect(
      within(identification).getByText('Rafael Moura Brandão'),
    ).toBeInTheDocument();
    const summary = section(content.summary.title);
    expect(
      within(summary).getByText(String(data.records.total)),
    ).toBeInTheDocument();
    for (const form of data.records.byForm) {
      expect(
        within(summary).getByText(
          content.summary.count(form.formName, form.total),
        ),
      ).toBeInTheDocument();
    }
    const evolution = section(content.evolution.title);
    expect(
      within(evolution).getByRole('heading', {
        name: new RegExp(data.series[0].name),
      }),
    ).toBeInTheDocument();
    const records = section(content.records.title);
    expect(within(records).getAllByRole('listitem')).toHaveLength(
      data.records.total,
    );
    const medications = section(content.medications.title);
    expect(
      within(medications).getByText(data.medications[0].name),
    ).toBeInTheDocument();
  });

  it('guarda o período no endereço e informa os indicadores que não podem ser calculados', async () => {
    const router = renderReport();
    const { data } = await getPatientReport(DIRCE);
    const day = todayInSaoPaulo(new Date(data.records.lastVisitedAt));
    await screen.findByText(content.identification.title);

    fireEvent.change(screen.getByLabelText(periodFieldsContent.from), {
      target: { value: day },
    });
    fireEvent.change(screen.getByLabelText(periodFieldsContent.to), {
      target: { value: day },
    });

    await waitFor(() =>
      expect(router.state.location.search).toContain(`de=${day}`),
    );
    expect(router.state.location.search).toContain(`ate=${day}`);
    const evolution = await waitFor(() => section(content.evolution.title));
    expect(
      (
        await within(evolution).findAllByText(
          evolutionSeriesContent.unavailable({
            reason: 'INSUFFICIENT_SAMPLES',
            minimumSamples: 2,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('aponta no campo o período inválido, sem gerar o relatório', async () => {
    renderReport(`${reportsPath(DIRCE)}&de=2026-11-10&ate=2026-11-01`);

    expect(
      await screen.findByText(periodFieldsContent.errors.IS_CALENDAR_DATE),
    ).toBeInTheDocument();
    expect(screen.queryByText(content.identification.title)).toBeNull();
  });

  it('exporta o PDF com o nome que a API dá ao arquivo', async () => {
    const names = stubDownloads();
    renderReport(`${reportsPath(DIRCE)}&de=2026-11-01&ate=2026-11-10`);

    fireEvent.click(
      await screen.findByRole('button', { name: content.exportPdf }),
    );

    await waitFor(() =>
      expect(names).toEqual(['relatorio-paciente-2026-11-01-a-2026-11-10.pdf']),
    );
  });

  it('mostra erro com nova tentativa quando a exportação falha', async () => {
    const names = stubDownloads();
    renderReport();
    const button = await screen.findByRole('button', {
      name: content.exportPdf,
    });
    await screen.findByText(content.identification.title);

    failNextRequest();
    fireEvent.click(button);

    expect(await screen.findByText(content.exportError)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: content.retry }));
    await waitFor(() => expect(names).toHaveLength(1));
    expect(screen.queryByText(content.exportError)).toBeNull();
  });
});

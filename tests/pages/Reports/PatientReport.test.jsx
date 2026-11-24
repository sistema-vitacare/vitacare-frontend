import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, reportsPath } from '../../../src/constants/routes.js';
import { evolutionSeriesContent } from '../../../src/data/evolutionSeries.js';
import { resourceStateContent } from '../../../src/data/patientFields.js';
import { patientReportContent as content } from '../../../src/data/patientReport.js';
import { periodFieldsContent } from '../../../src/data/periodFields.js';
import PatientReport from '../../../src/pages/Reports/PatientReport.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { apiFailure, apiFile, apiStub } from '../../support/apiStub.js';
import { patientRoutes } from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const NOW = new Date('2026-11-13T15:00:00.000Z');
const REPORT = 'GET /patients/:patientId/report';
const PDF = 'GET /patients/:patientId/report/pdf';
const LIMIT_MESSAGE =
  'O período tem registros demais para um relatório. Escolha um período menor.';

const visit = (day) => ({
  id: `record-${day}`,
  patientId: DIRCE,
  form: {
    id: 'form-1',
    name: 'Sinais vitais',
    versionId: 'v1',
    versionNumber: 1,
  },
  author: { id: 'u3', name: 'Rosângela Prado' },
  visitedAt: `${day}T12:00:00.000Z`,
  submittedAt: `${day}T12:05:00.000Z`,
  notes: null,
  status: 'valid',
  annulment: null,
  answers: [
    {
      fieldId: 'field-1',
      fieldKey: 'glicemia',
      name: 'Glicemia capilar',
      fieldType: 'number',
      unit: 'mg/dL',
      section: 'Sinais vitais',
      position: 0,
      value: 105,
    },
  ],
});

// Relatório no formato do exemplo de `patients-relatorio.md`. No período de
// um dia só, a tendência não pode ser calculada, como a API informa.
function report({ from = '2026-10-15', to = '2026-11-13' }) {
  const days = from === to ? [from] : ['2026-11-01', '2026-11-10'];
  return {
    generatedAt: '2026-11-13T15:00:00.000Z',
    generatedBy: { id: 'u1', name: 'Rafael Moura Brandão' },
    organization: { name: 'Residencial Ipê Amarelo' },
    period: { from, to, timeZone: 'America/Sao_Paulo' },
    patient: {
      id: DIRCE,
      name: 'Dirce Albuquerque Moraes',
      birthDate: '1941-05-20',
      sex: 'female',
      status: 'active',
      mainCondition: 'Hipertensão arterial',
      secondaryConditions: [],
      responsible: { id: 'u1', name: 'Rafael Moura Brandão' },
    },
    records: {
      total: days.length,
      firstVisitedAt: `${days[0]}T12:00:00.000Z`,
      lastVisitedAt: `${days.at(-1)}T12:00:00.000Z`,
      byForm: [
        { formId: 'form-1', formName: 'Sinais vitais', total: days.length },
      ],
      byAuthor: [{ userId: 'u3', name: 'Rosângela Prado', total: days.length }],
      items: days.map(visit),
    },
    series: [
      {
        fieldKey: 'glicemia',
        name: 'Glicemia capilar',
        fieldType: 'number',
        unit: 'mg/dL',
        scaleMin: null,
        scaleMax: null,
        section: 'Sinais vitais',
        form: { id: 'form-1', name: 'Sinais vitais' },
        points: days.map((day) => ({
          value: 105,
          visitedAt: `${day}T12:00:00.000Z`,
          followUpId: `record-${day}`,
        })),
        indicators:
          days.length === 1
            ? {
                sampleSize: 1,
                min: 105,
                max: 105,
                mean: 105,
                variation: 0,
                trend: null,
                unavailable: [
                  {
                    indicator: 'trend',
                    reason: 'INSUFFICIENT_SAMPLES',
                    minimumSamples: 2,
                  },
                ],
              }
            : {
                sampleSize: 2,
                min: 105,
                max: 105,
                mean: 105,
                variation: 0,
                trend: { slopePerDay: 0, direction: 'flat' },
                unavailable: [],
              },
      },
    ],
    medications: [
      {
        id: 'med-1',
        patientId: DIRCE,
        name: 'Losartana potássica',
        doseAmount: 50,
        doseUnit: 'mg',
        route: 'oral',
        notes: null,
        schedule: {
          startDate: '2026-10-01',
          endDate: null,
          intervalDays: 1,
          times: ['08:00', '20:00'],
          timeZone: 'America/Sao_Paulo',
        },
        remindersEnabled: false,
        nextScheduledAt: '2026-11-13T23:00:00.000Z',
        scheduleConflicts: [],
        status: 'active',
        createdBy: { id: 'u1', name: 'Rafael Moura Brandão' },
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
        deactivatedAt: null,
      },
    ],
  };
}

function answerReport() {
  apiStub().use({
    [REPORT]: ({ query }) => ({ data: report(query), meta: {} }),
    [PDF]: ({ query }) =>
      apiFile('%PDF-1.4', {
        fileName: `relatorio-paciente-${query.from ?? '2026-10-15'}-a-${query.to ?? '2026-11-13'}.pdf`,
        type: 'application/pdf',
      }),
  });
}

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

describe('PatientReport', () => {
  it('pede o paciente antes de gerar o relatório', async () => {
    answerReport();
    renderReport(PATHS.REPORTS);

    expect(
      await screen.findByText(content.picker.choosePatient),
    ).toBeInTheDocument();
    expect(apiStub().last(REPORT)).toBeUndefined();
  });

  // Como na API, o relatório não traz CPF nem contato do paciente.
  it('não mostra CPF nem telefone do paciente', async () => {
    answerReport();
    renderReport();
    await screen.findByText(content.identification.title);

    expect(screen.queryByText(/\d{3}\.\d{3}\.\d{3}-\d{2}/)).toBeNull();
    expect(screen.queryByText(/\(\d{2}\) \d{4,5}-\d{4}/)).toBeNull();
  });

  it('mostra identificação, resumo, evolução, registros e medicamentos, sem período na query', async () => {
    answerReport();
    renderReport();

    expect(
      await screen.findByText(content.period('15/10/2026', '13/11/2026')),
    ).toBeInTheDocument();
    expect(apiStub().last(REPORT)).toMatchObject({
      params: { patientId: DIRCE },
      query: {},
    });
    const identification = section(content.identification.title);
    expect(
      within(identification).getByText('Hipertensão arterial'),
    ).toBeInTheDocument();
    expect(
      within(identification).getByText('Rafael Moura Brandão'),
    ).toBeInTheDocument();
    const summary = section(content.summary.title);
    expect(within(summary).getByText('2')).toBeInTheDocument();
    expect(
      within(summary).getByText(content.summary.count('Sinais vitais', 2)),
    ).toBeInTheDocument();
    expect(
      within(section(content.evolution.title)).getByRole('heading', {
        name: /Glicemia capilar/,
      }),
    ).toBeInTheDocument();
    expect(
      within(section(content.records.title)).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(section(content.medications.title)).getByText(
        'Losartana potássica',
      ),
    ).toBeInTheDocument();
  });

  it('guarda o período no endereço e informa os indicadores que a API não calcula', async () => {
    answerReport();
    const router = renderReport();
    await screen.findByText(content.identification.title);

    fireEvent.change(screen.getByLabelText(periodFieldsContent.from), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText(periodFieldsContent.to), {
      target: { value: '2026-11-10' },
    });

    await waitFor(() =>
      expect(router.state.location.search).toContain('de=2026-11-10'),
    );
    expect(router.state.location.search).toContain('ate=2026-11-10');
    const evolution = await waitFor(() => section(content.evolution.title));
    expect(
      await within(evolution).findByText(
        evolutionSeriesContent.unavailable({
          reason: 'INSUFFICIENT_SAMPLES',
          minimumSamples: 2,
        }),
      ),
    ).toBeInTheDocument();
    expect(apiStub().last(REPORT).query).toEqual({
      from: '2026-11-10',
      to: '2026-11-10',
    });
  });

  it('aponta no campo o período inválido, sem pedir o relatório', async () => {
    answerReport();
    renderReport(`${reportsPath(DIRCE)}&de=2026-11-10&ate=2026-11-01`);

    expect(
      await screen.findByText(periodFieldsContent.errors.IS_CALENDAR_DATE),
    ).toBeInTheDocument();
    expect(screen.queryByText(content.identification.title)).toBeNull();
    expect(apiStub().last(REPORT)).toBeUndefined();
  });

  it('no período com registros demais, mostra a mensagem da API, sem nova tentativa', async () => {
    apiStub().use({
      [REPORT]: () => apiFailure(422, 'REPORT_TOO_MANY_RECORDS', LIMIT_MESSAGE),
    });
    renderReport();

    expect(await screen.findByText(LIMIT_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resourceStateContent.retry }),
    ).toBeNull();
  });

  it('exporta o PDF com o nome que a API dá ao arquivo', async () => {
    answerReport();
    const names = stubDownloads();
    renderReport(`${reportsPath(DIRCE)}&de=2026-11-01&ate=2026-11-10`);

    fireEvent.click(
      await screen.findByRole('button', { name: content.exportPdf }),
    );

    await waitFor(() =>
      expect(names).toEqual(['relatorio-paciente-2026-11-01-a-2026-11-10.pdf']),
    );
    expect(apiStub().last(PDF).query).toEqual({
      from: '2026-11-01',
      to: '2026-11-10',
    });
  });

  it('mostra erro com nova tentativa quando a exportação falha', async () => {
    answerReport();
    const names = stubDownloads();
    renderReport();
    const button = await screen.findByRole('button', {
      name: content.exportPdf,
    });
    await screen.findByText(content.identification.title);

    apiStub().fail(PDF);
    fireEvent.click(button);

    expect(await screen.findByText(content.exportError)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: content.retry }));
    await waitFor(() => expect(names).toHaveLength(1));
    expect(screen.queryByText(content.exportError)).toBeNull();
  });

  it('no limite da exportação, mostra a mensagem da API, sem nova tentativa', async () => {
    answerReport();
    stubDownloads();
    renderReport();
    const button = await screen.findByRole('button', {
      name: content.exportPdf,
    });
    await screen.findByText(content.identification.title);

    apiStub().fail(
      PDF,
      apiFailure(422, 'REPORT_TOO_MANY_RECORDS', LIMIT_MESSAGE),
    );
    fireEvent.click(button);

    expect(await screen.findByText(LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(content.exportError)).toBeNull();
    expect(screen.queryByRole('button', { name: content.retry })).toBeNull();
  });
});

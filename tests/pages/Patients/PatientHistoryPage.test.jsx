import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  patientPath,
  recordPath,
} from '../../../src/constants/routes.js';
import { evolutionSeriesContent as seriesContent } from '../../../src/data/evolutionSeries.js';
import { followUpRecordsContent as recordsContent } from '../../../src/data/followUpRecords.js';
import { patientHistoryContent as content } from '../../../src/data/patientHistory.js';
import { periodFieldsContent } from '../../../src/data/periodFields.js';
import PatientHistoryPage from '../../../src/pages/Patients/PatientHistoryPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { buildIndicators } from '../../../src/utils/evolution.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import { apiPatient } from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const EVOLUTION = 'GET /patients/:patientId/evolution';

const day = (n) => new Date(Date.UTC(2026, 9, 20 + n, 12)).toISOString();

function series(fieldKey, name, unit, values) {
  const points = values.map((value, index) => ({
    value,
    visitedAt: day(index * 3),
    followUpId: `${fieldKey}-${index}`,
  }));
  return {
    fieldKey,
    name,
    fieldType: 'number',
    unit,
    scaleMin: null,
    scaleMax: null,
    section: 'Sinais vitais',
    form: { id: 'f1', name: 'Sinais vitais diários' },
    points,
    indicators: buildIndicators(points),
  };
}

// Evolução como a API a devolve (`patients-evolucao.md`).
function evolution(seriesList, message) {
  return () => ({
    data: {
      patientId: DIRCE,
      period: {
        from: '2026-10-12',
        to: '2026-11-10',
        timeZone: 'America/Sao_Paulo',
      },
      series: seriesList,
    },
    meta: message ? { message } : {},
  });
}

const SERIES = [
  series('k1', 'Glicemia capilar', 'mg/dL', [105, 98, 142]),
  series('k2', 'Pressão sistólica', 'mmHg', [131, 126]),
];

function renderHistory(
  patientId,
  profile = 'professional',
  { patient = apiPatient(patientId), evolutionAnswer = evolution(SERIES) } = {},
) {
  apiStub().use({
    'GET /patients/:patientId': () => ({ data: patient, meta: {} }),
    [EVOLUTION]: evolutionAnswer,
  });
  return renderPage(
    [
      { path: PATHS.PATIENT_HISTORY, element: <PatientHistoryPage /> },
      { path: PATHS.PATIENT_DETAIL, element: <p>Detalhe</p> },
    ],
    { profile, path: patientPath(patientId, 'history') },
  );
}

function recordList() {
  return screen.getByRole('list', { name: recordsContent.list.title });
}

function records() {
  return within(recordList()).getAllByRole('listitem');
}

async function select(label, option) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('PatientHistoryPage', () => {
  it('pagina o histórico de 20 em 20', async () => {
    renderHistory(DIRCE);
    await screen.findByText(recordsContent.list.count(28));
    expect(records()).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: /página 2/ }));

    await waitFor(() => expect(records()).toHaveLength(8));
  });

  it('lista os registros do mais recente ao mais antigo, com data, autor, formulário e valores', async () => {
    renderHistory(DIRCE);

    await screen.findByText(recordsContent.list.count(28));
    const [newest, second] = records();
    expect(newest).toHaveTextContent('Sinais vitais');
    expect(newest).toHaveTextContent('Rosângela Prado');
    expect(newest).toHaveTextContent('Pressão sistólica: 126 mmHg');
    expect(second).toHaveTextContent('Acompanhamento diário');
    expect(second).toHaveTextContent('Alimentou-se bem: Sim');
    expect(second).toHaveTextContent('Dor: 0');
  });

  it('leva cada registro ao detalhe dele', async () => {
    renderHistory(DIRCE);
    await screen.findByText(recordsContent.list.count(28));

    const [newest] = records();
    const link = within(newest).getByRole('link', { name: /Abrir o registro/ });

    expect(link).toHaveAttribute(
      'href',
      recordPath('f0110000-0000-5000-8000-000100000013'),
    );
  });

  it('identifica o registro anulado, com quem anulou e o motivo', async () => {
    renderHistory(DIRCE);
    await screen.findByText(recordsContent.list.count(28));

    // O anulado é de 16 dias atrás: o 11º da lista, ainda na primeira página.
    const annulled = await waitFor(() => {
      const found = records().find((item) =>
        item.textContent.includes(recordsContent.list.annulled),
      );
      expect(found).toBeDefined();
      return found;
    });
    expect(annulled).toHaveTextContent('Rafael Moura Brandão');
    expect(annulled).toHaveTextContent('manguito de tamanho errado');
  });

  it('filtra pelo formulário e pelo período, e pede à API a evolução do período', async () => {
    renderHistory(DIRCE);
    await screen.findByText(recordsContent.list.count(28));

    await select(recordsContent.filters.form, 'Acompanhamento diário');

    expect(
      await screen.findByText(recordsContent.list.count(14)),
    ).toBeInTheDocument();
    expect(
      records().every((item) =>
        item.textContent.includes('Acompanhamento diário'),
      ),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(periodFieldsContent.from), {
      target: { value: '2000-01-01' },
    });
    fireEvent.change(screen.getByLabelText(periodFieldsContent.to), {
      target: { value: '2000-01-31' },
    });

    expect(
      await screen.findByText(recordsContent.list.noResults),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(apiStub().last(EVOLUTION).query).toEqual({
        from: '2000-01-01',
        to: '2000-01-31',
      }),
    );
  });

  it('mostra a evolução que a API devolve, com média, variação e tendência', async () => {
    renderHistory(DIRCE);

    const section = await screen.findByRole('region', {
      name: content.evolution.title,
    });
    expect(
      await within(section).findByRole('figure', {
        name: seriesContent.chartLabel('Glicemia capilar'),
      }),
    ).toBeInTheDocument();
    expect(within(section).getAllByText(seriesContent.mean)).toHaveLength(2);
    expect(
      within(section).getByText(content.evolution.defaultPeriod),
    ).toBeVisible();
    expect(apiStub().last(EVOLUTION)).toMatchObject({
      params: { patientId: DIRCE },
      query: {},
    });
  });

  it('dá à familiar o modo leitura, sem registro anulado, com a evolução', async () => {
    renderHistory(DIRCE, 'family', {
      patient: apiPatient(DIRCE, {
        viewerLink: { role: 'family', linkType: 'Filha' },
      }),
    });

    expect(await screen.findByText(content.readOnly)).toBeInTheDocument();
    expect(
      await screen.findByText(recordsContent.list.count(27)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: content.evolution.title }),
    ).toBeVisible();
  });

  it('não pede nem mostra a evolução à cuidadora, que não tem essa permissão', async () => {
    renderHistory(DIRCE, 'caregiver');
    await screen.findByText(recordsContent.list.count(28));

    expect(
      screen.queryByRole('region', { name: content.evolution.title }),
    ).toBeNull();
    expect(screen.queryByText(content.readOnly)).toBeNull();
    expect(apiStub().last(EVOLUTION)).toBeUndefined();
  });

  it('mostra a mensagem da API quando o período não tem medição', async () => {
    const message = 'Nenhuma medição no período selecionado.';
    renderHistory(CLEUSA, 'professional', {
      evolutionAnswer: evolution([], message),
    });

    expect(
      await screen.findByText(recordsContent.list.empty),
    ).toBeInTheDocument();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(content.evolution.empty)).toBeNull();
  });

  it('diz que o paciente não foi encontrado quando a API responde 404', async () => {
    renderHistory(IOLANDA, 'caregiver');
    apiStub().use({
      'GET /patients/:patientId': () =>
        apiFailure(404, 'PATIENT_NOT_FOUND', 'Paciente não encontrado.'),
    });

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });
});

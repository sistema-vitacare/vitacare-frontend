import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, patientPath } from '../../../src/constants/routes.js';
import { patientHistoryContent as content } from '../../../src/data/patientHistory.js';
import PatientHistoryPage from '../../../src/pages/Patients/PatientHistoryPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

function renderHistory(patientId, profile = 'professional') {
  return renderPage(
    [
      { path: PATHS.PATIENT_HISTORY, element: <PatientHistoryPage /> },
      { path: PATHS.PATIENT_DETAIL, element: <p>Detalhe</p> },
    ],
    { profile, path: patientPath(patientId, 'history') },
  );
}

function recordList() {
  return screen.getByRole('list', { name: content.records.title });
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
    await screen.findByText(content.records.count(28));
    expect(records()).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: /página 2/ }));

    await waitFor(() => expect(records()).toHaveLength(8));
  });

  it('lista os registros do mais recente ao mais antigo, com data, autor, formulário e valores', async () => {
    renderHistory(DIRCE);

    await screen.findByText(content.records.count(28));
    const [newest, second] = records();
    expect(newest).toHaveTextContent('Sinais vitais');
    expect(newest).toHaveTextContent('Rosângela Prado');
    expect(newest).toHaveTextContent('Pressão sistólica: 126 mmHg');
    expect(second).toHaveTextContent('Acompanhamento diário');
    expect(second).toHaveTextContent('Alimentou-se bem: Sim');
    expect(second).toHaveTextContent('Dor: 0');
  });

  it('identifica o registro anulado, com quem anulou e o motivo', async () => {
    renderHistory(DIRCE);
    await screen.findByText(content.records.count(28));

    // O anulado é de 16 dias atrás: o 11º da lista, ainda na primeira página.
    const annulled = await waitFor(() => {
      const found = records().find((item) =>
        item.textContent.includes(content.records.annulled),
      );
      expect(found).toBeDefined();
      return found;
    });
    expect(annulled).toHaveTextContent('Rafael Moura Brandão');
    expect(annulled).toHaveTextContent('manguito de tamanho errado');
  });

  it('filtra pelo formulário e pelo período', async () => {
    renderHistory(DIRCE);
    await screen.findByText(content.records.count(28));

    await select(content.filters.form, 'Acompanhamento diário');

    expect(
      await screen.findByText(content.records.count(14)),
    ).toBeInTheDocument();
    expect(
      records().every((item) =>
        item.textContent.includes('Acompanhamento diário'),
      ),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(content.filters.from), {
      target: { value: '2000-01-01' },
    });
    fireEvent.change(screen.getByLabelText(content.filters.to), {
      target: { value: '2000-01-31' },
    });

    expect(
      await screen.findByText(content.records.noResults),
    ).toBeInTheDocument();
  });

  it('mostra a evolução por parâmetro, com média, variação e tendência', async () => {
    renderHistory(DIRCE);

    const section = await screen.findByRole('region', {
      name: content.evolution.title,
    });
    expect(
      await within(section).findByRole('figure', {
        name: content.evolution.chartLabel('Glicemia capilar'),
      }),
    ).toBeInTheDocument();
    expect(within(section).getAllByText(content.evolution.mean).length).toBe(7);
    expect(
      within(section).getByText(content.evolution.defaultPeriod),
    ).toBeVisible();
  });

  it('dá à familiar o modo leitura, sem registro anulado, com a evolução', async () => {
    renderHistory(DIRCE, 'family');

    expect(await screen.findByText(content.readOnly)).toBeInTheDocument();
    expect(
      await screen.findByText(content.records.count(27)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: content.evolution.title }),
    ).toBeVisible();
  });

  it('não mostra a evolução à cuidadora, que não tem essa permissão', async () => {
    renderHistory(DIRCE, 'caregiver');
    await screen.findByText(content.records.count(28));

    expect(
      screen.queryByRole('region', { name: content.evolution.title }),
    ).toBeNull();
    expect(screen.queryByText(content.readOnly)).toBeNull();
  });

  it('avisa quando o paciente não tem registros nem medições', async () => {
    renderHistory(CLEUSA);

    expect(await screen.findByText(content.records.empty)).toBeInTheDocument();
    expect(
      await screen.findByText(content.evolution.empty),
    ).toBeInTheDocument();
  });

  it('diz que o paciente não foi encontrado quando está fora do alcance', async () => {
    renderHistory(IOLANDA, 'caregiver');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });
});

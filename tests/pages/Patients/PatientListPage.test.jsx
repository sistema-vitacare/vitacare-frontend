import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, patientPath } from '../../../src/constants/routes.js';
import { patientListContent as content } from '../../../src/data/patientList.js';
import PatientListPage from '../../../src/pages/Patients/PatientListPage.jsx';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';

function renderList(profile, { path = PATHS.PATIENTS, width } = {}) {
  return renderPage(
    [
      { path: PATHS.PATIENTS, element: <PatientListPage /> },
      { path: PATHS.PATIENT_NEW, element: <p>Cadastro</p> },
      { path: PATHS.PATIENT_DETAIL, element: <p>Detalhe</p> },
      { path: PATHS.PATIENT_HISTORY, element: <p>Acompanhamento</p> },
    ],
    { profile, path, width },
  );
}

function table() {
  return screen.getByRole('table');
}

function rowNames() {
  return within(table())
    .getAllByRole('link')
    .map((link) => link.textContent);
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('PatientListPage', () => {
  it('lista os ativos com CPF mascarado, condição, responsável e situação', async () => {
    renderList('admin');

    expect(
      await screen.findByText(content.subtitle(22, 'active')),
    ).toBeInTheDocument();
    const firstRow = within(table()).getAllByRole('row')[1];
    expect(
      within(firstRow).getByText('Amélia Guedes Barreto'),
    ).toBeInTheDocument();
    expect(
      within(firstRow).getByText(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/),
    ).toBeInTheDocument();
    expect(within(firstRow).getByText('Osteoporose')).toBeInTheDocument();
    expect(within(firstRow).getByText('Beatriz Okamoto')).toBeInTheDocument();
    expect(within(firstRow).getByText('Ativo')).toBeInTheDocument();
  });

  it('abre o detalhe pelo nome do paciente', async () => {
    const router = renderList('admin', {
      path: `${PATHS.PATIENTS}?busca=dirce`,
    });

    fireEvent.click(
      await screen.findByRole('link', { name: 'Dirce Albuquerque Moraes' }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(patientPath(DIRCE)),
    );
  });

  it('mostra "Novo paciente" só para quem cadastra', async () => {
    renderList('professional');
    await screen.findByRole('table');

    expect(
      screen.getByRole('link', { name: content.newPatient }),
    ).toHaveAttribute('href', PATHS.PATIENT_NEW);
  });

  it('não mostra "Novo paciente" à cuidadora, que vê só os pacientes vinculados', async () => {
    renderList('caregiver');

    expect(
      await screen.findByText(content.subtitle(4, 'active')),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: content.newPatient })).toBeNull();
    expect(rowNames()).toEqual([
      'Benedito Arruda Paiva',
      'Cleusa Marçal Rezende',
      'Dirce Albuquerque Moraes',
      'Osvaldo Teixeira Lins',
    ]);
  });

  it('aplica a busca e guarda o termo no endereço', async () => {
    const router = renderList('admin');
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'dirce' },
    });

    await waitFor(() =>
      expect(rowNames()).toEqual(['Dirce Albuquerque Moraes']),
    );
    expect(router.state.location.search).toBe('?busca=dirce');
  });

  it('abre com o termo vindo do endereço, como faz a busca da barra superior', async () => {
    renderList('admin', { path: `${PATHS.PATIENTS}?busca=osvaldo` });

    await waitFor(() => expect(rowNames()).toEqual(['Osvaldo Teixeira Lins']));
    expect(screen.getByLabelText(content.searchLabel)).toHaveValue('osvaldo');
  });

  it('filtra pela condição e lista os inativos pelo filtro de situação', async () => {
    renderList('admin', { path: `${PATHS.PATIENTS}?situacao=inactive` });

    await waitFor(() =>
      expect(rowNames()).toEqual([
        'Alzira Prates Monteiro',
        'Moacir Pedrosa Vilela',
      ]),
    );
    expect(
      screen.getByText(content.subtitle(2, 'inactive')),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(content.conditionLabel), {
      target: { value: 'avc' },
    });

    await waitFor(() => expect(rowNames()).toEqual(['Moacir Pedrosa Vilela']));
  });

  it('pagina de 20 em 20', async () => {
    const router = renderList('admin');
    await screen.findByText(content.range(1, 20, 22));

    fireEvent.click(screen.getByRole('button', { name: /page 2|página 2/i }));

    expect(
      await screen.findByText(content.range(21, 22, 22)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?pagina=2');
  });

  it('avisa quando a busca não encontra ninguém', async () => {
    renderList('admin', { path: `${PATHS.PATIENTS}?busca=ninguem` });

    expect(await screen.findByText(content.noResults)).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando a lista falha', async () => {
    renderList('admin');
    await screen.findByRole('table');
    failNextRequest();

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'dirce' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar de novo' }),
    );

    await waitFor(() =>
      expect(rowNames()).toEqual(['Dirce Albuquerque Moraes']),
    );
  });

  it('leva a familiar com um único paciente direto ao acompanhamento dele', async () => {
    const router = renderList('family');

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        patientPath(DIRCE, 'history'),
      ),
    );
  });

  it('troca a tabela por cartões no celular', async () => {
    renderList('caregiver', { width: 375 });

    expect(
      await screen.findByText('Dirce Albuquerque Moraes'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByRole('link', { name: /Dirce Albuquerque Moraes/ }),
    ).toBeInTheDocument();
  });
});

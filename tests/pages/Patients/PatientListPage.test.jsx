import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, patientPath } from '../../../src/constants/routes.js';
import { patientListContent as content } from '../../../src/data/patientList.js';
import PatientListPage from '../../../src/pages/Patients/PatientListPage.jsx';
import { apiPage, apiStub } from '../../support/apiStub.js';
import {
  activePatients,
  apiPatient,
  patientRoutes,
} from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { prefixesOf, typeLikeBrowser } from '../../support/browserTyping.js';

const LIST = 'GET /patients';
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const CAREGIVER_PATIENTS = [
  'Benedito Arruda Paiva',
  'Cleusa Marçal Rezende',
  'Dirce Albuquerque Moraes',
  'Osvaldo Teixeira Lins',
];

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

function answer(handler) {
  apiStub().use({ [LIST]: handler });
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
  resetViewport();
});

describe('PatientListPage', () => {
  it('lista os ativos com CPF mascarado, condição, responsável e situação', async () => {
    apiStub().use(patientRoutes());
    renderList('admin');

    expect(
      await screen.findByText(
        content.subtitle(activePatients().length, 'active'),
      ),
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
    expect(apiStub().last(LIST).query).toEqual({
      status: 'active',
      page: '1',
      limit: '20',
    });
  });

  it('abre o detalhe pelo nome do paciente', async () => {
    apiStub().use(patientRoutes([apiPatient(DIRCE)]));
    const router = renderList('admin');

    fireEvent.click(
      await screen.findByRole('link', { name: 'Dirce Albuquerque Moraes' }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(patientPath(DIRCE)),
    );
  });

  it('mostra "Novo paciente" só para quem cadastra', async () => {
    apiStub().use(patientRoutes());
    renderList('professional');
    await screen.findByRole('table');

    expect(
      screen.getByRole('link', { name: content.newPatient }),
    ).toHaveAttribute('href', PATHS.PATIENT_NEW);
  });

  it('não mostra "Novo paciente" à cuidadora, que vê só os pacientes que a API devolve', async () => {
    apiStub().use(
      patientRoutes(
        activePatients().filter((patient) =>
          CAREGIVER_PATIENTS.includes(patient.name),
        ),
      ),
    );
    renderList('caregiver');

    expect(
      await screen.findByText(content.subtitle(4, 'active')),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: content.newPatient })).toBeNull();
    expect(rowNames()).toEqual(CAREGIVER_PATIENTS);
  });

  it('pede a busca por nome à API e guarda o termo no endereço', async () => {
    answer(({ query }) =>
      apiPage(query.search ? [apiPatient(DIRCE)] : activePatients()),
    );
    const router = renderList('admin');
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'dirce' },
    });

    await waitFor(() =>
      expect(rowNames()).toEqual(['Dirce Albuquerque Moraes']),
    );
    expect(apiStub().last(LIST).query.search).toBe('dirce');
    expect(router.state.location.search).toBe('?busca=dirce');
  });

  it('guarda no campo cada letra da busca na hora em que ela entra e manda o texto inteiro à API', async () => {
    answer(({ query }) => apiPage(query.search ? [] : activePatients()));
    renderList('admin');
    await screen.findByRole('table');

    const field = screen.getByLabelText(content.searchLabel);
    expect(typeLikeBrowser(field, 'Fictícia')).toEqual(prefixesOf('Fictícia'));
    await waitFor(() =>
      expect(apiStub().last(LIST).query.search).toBe('Fictícia'),
    );
  });

  it('guarda no campo cada letra da condição na hora em que ela entra e manda o texto inteiro à API', async () => {
    answer(({ query }) => apiPage(query.condition ? [] : activePatients()));
    renderList('admin');
    await screen.findByRole('table');

    const field = screen.getByLabelText(content.conditionLabel);
    expect(typeLikeBrowser(field, 'Fictícia')).toEqual(prefixesOf('Fictícia'));
    await waitFor(() =>
      expect(apiStub().last(LIST).query.condition).toBe('Fictícia'),
    );
  });

  it('busca por CPF sem pôr o documento no endereço', async () => {
    answer(({ query }) =>
      apiPage(query.search ? [apiPatient(DIRCE)] : activePatients()),
    );
    const router = renderList('admin');
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: '040.646.054-03' },
    });

    await waitFor(() =>
      expect(rowNames()).toEqual(['Dirce Albuquerque Moraes']),
    );
    expect(apiStub().last(LIST).query.search).toBe('040.646.054-03');
    expect(router.state.location.search).toBe('');
    expect(router.state.location.state).toEqual({ search: '040.646.054-03' });
  });

  it('abre com o termo vindo do endereço, como faz a busca da barra superior', async () => {
    answer(() => apiPage([apiPatient(OSVALDO)]));
    renderList('admin', { path: `${PATHS.PATIENTS}?busca=osvaldo` });

    await waitFor(() => expect(rowNames()).toEqual(['Osvaldo Teixeira Lins']));
    expect(screen.getByLabelText(content.searchLabel)).toHaveValue('osvaldo');
    expect(apiStub().last(LIST).query.search).toBe('osvaldo');
  });

  it('abre com o CPF vindo do estado da rota, como faz o aviso de CPF repetido', async () => {
    answer(() => apiPage([apiPatient(DIRCE)]));
    renderList('admin', {
      path: { pathname: PATHS.PATIENTS, state: { search: '04064605403' } },
    });

    await waitFor(() =>
      expect(rowNames()).toEqual(['Dirce Albuquerque Moraes']),
    );
    expect(screen.getByLabelText(content.searchLabel)).toHaveValue(
      '04064605403',
    );
    expect(apiStub().last(LIST).query.search).toBe('04064605403');
  });

  it('pede os inativos pelo filtro de situação e a condição digitada', async () => {
    const inactive = [apiPatient('a2cacec9-94ff-5eae-b091-c9448add206b')].map(
      (patient) => ({ ...patient, status: 'inactive' }),
    );
    answer(() => apiPage(inactive));
    renderList('admin', { path: `${PATHS.PATIENTS}?situacao=inactive` });

    expect(
      await screen.findByText(content.subtitle(1, 'inactive')),
    ).toBeInTheDocument();
    expect(apiStub().last(LIST).query.status).toBe('inactive');

    fireEvent.change(screen.getByLabelText(content.conditionLabel), {
      target: { value: 'avc' },
    });

    await waitFor(() =>
      expect(apiStub().last(LIST).query).toMatchObject({
        status: 'inactive',
        condition: 'avc',
      }),
    );
  });

  it('pagina de 20 em 20, com a página no endereço', async () => {
    const all = activePatients();
    answer(({ query }) =>
      query.page === '2'
        ? apiPage(all.slice(20), { page: 2, total: all.length })
        : apiPage(all.slice(0, 20), { total: all.length }),
    );
    const router = renderList('admin');
    await screen.findByText(content.range(1, 20, all.length));

    fireEvent.click(screen.getByRole('button', { name: /página 2/i }));

    expect(
      await screen.findByText(content.range(21, all.length, all.length)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?pagina=2');
    expect(apiStub().last(LIST).query.page).toBe('2');
  });

  it('mostra a mensagem da API quando a busca não encontra ninguém', async () => {
    const message = 'Nenhum paciente encontrado para os filtros informados.';
    answer(() => apiPage([], { message }));
    renderList('admin', { path: `${PATHS.PATIENTS}?busca=ninguem` });

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('mostra à familiar sem vínculo a orientação da API, sem acesso negado', async () => {
    const message =
      'Você ainda não tem paciente vinculado. Peça ao profissional responsável para liberar o seu acesso.';
    answer(() => apiPage([], { message }));
    renderList('family');

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando a lista falha', async () => {
    apiStub().use(patientRoutes());
    apiStub().fail(LIST);
    renderList('admin');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar de novo' }),
    );

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('leva a familiar com um único paciente direto ao acompanhamento dele, pelo vínculo', async () => {
    apiStub().use(
      patientRoutes([
        apiPatient(DIRCE, {
          viewerLink: { role: 'family', linkType: 'Filha' },
        }),
      ]),
    );
    const router = renderList('family');

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        patientPath(DIRCE, 'history'),
      ),
    );
  });

  it('troca a tabela por cartões no celular', async () => {
    apiStub().use(patientRoutes([apiPatient(DIRCE)]));
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

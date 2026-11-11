import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATHS, patientPath } from '../../../src/constants/routes.js';
import { patientFieldLabels as labels } from '../../../src/data/patientFields.js';
import {
  patientFormContent as content,
  patientFieldErrors as errors,
} from '../../../src/data/patientForm.js';
import PatientFormPage from '../../../src/pages/Patients/PatientFormPage.jsx';
import {
  ApiError,
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { listEligibleUsers } from '../../../src/services/patientLinkService.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

// A lista de responsáveis passa pelo serviço real; um teste a segura para
// ver a tela no intervalo em que o paciente já chegou e ela ainda não.
vi.mock(
  '../../../src/services/patientLinkService.js',
  async (importOriginal) => {
    const original = await importOriginal();
    return {
      ...original,
      listEligibleUsers: vi.fn(original.listEligibleUsers),
    };
  },
);

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const ALZIRA_CPF = '007.221.699-90';

function renderForm(path, profile = 'professional') {
  return renderPage(
    [
      { path: PATHS.PATIENT_NEW, element: <PatientFormPage /> },
      { path: PATHS.PATIENT_EDIT, element: <PatientFormPage /> },
      { path: PATHS.PATIENT_DETAIL, element: <p>Detalhe</p> },
      { path: PATHS.PATIENTS, element: <p>Lista</p> },
    ],
    { profile, path },
  );
}

function field(name) {
  return screen.getByLabelText(labels[name], {
    exact: false,
    selector: 'input, textarea',
  });
}

function type(name, value) {
  fireEvent.change(field(name), { target: { value } });
}

// O campo fica desabilitado até a lista de responsáveis chegar; clicar antes
// disso não abre as opções.
async function chooseResponsible(name) {
  const responsible = screen.getByRole('combobox', {
    name: new RegExp(labels.responsibleUserId),
  });
  await waitFor(() => expect(responsible).not.toHaveAttribute('aria-disabled'));
  fireEvent.mouseDown(responsible);
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(name) }),
  );
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: content.save }));
}

async function fillRequired() {
  await screen.findByRole('heading', { level: 1, name: content.newTitle });
  type('name', 'Matilde Ferreira Campos');
  type('birthDate', '1944-02-03');
  await chooseResponsible('Rafael Moura Brandão');
}

afterEach(() => {
  vi.restoreAllMocks();
  resetMockState();
  resetViewport();
});

describe('PatientFormPage no cadastro', () => {
  it('organiza os campos em dados pessoais, endereço e informações clínicas', async () => {
    renderForm(PATHS.PATIENT_NEW);

    expect(
      await screen.findByRole('heading', { name: content.sections.personal }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: content.sections.address }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: content.sections.clinical }),
    ).toBeInTheDocument();
    expect(field('cpf')).toBeInTheDocument();
    expect(field('zipCode')).toBeInTheDocument();
    expect(field('healthPlan')).toBeInTheDocument();
  });

  it('bloqueia o salvamento e destaca os obrigatórios pendentes', async () => {
    const router = renderForm(PATHS.PATIENT_NEW);
    await screen.findByRole('heading', { level: 1, name: content.newTitle });

    save();

    expect(await screen.findByText(errors.name.required)).toBeInTheDocument();
    expect(screen.getByText(errors.birthDate.required)).toBeVisible();
    expect(screen.getByText(errors.responsibleUserId.required)).toBeVisible();
    expect(screen.getByText(content.invalidFields)).toBeVisible();
    expect(field('name')).toHaveAttribute('aria-invalid', 'true');
    expect(router.state.location.pathname).toBe(PATHS.PATIENT_NEW);
  });

  it('aplica as máscaras de CPF, telefone e CEP enquanto o usuário digita', async () => {
    renderForm(PATHS.PATIENT_NEW);
    await screen.findByRole('heading', { level: 1, name: content.newTitle });

    type('cpf', '52998224725');
    type('phone', '16997873407');
    type('zipCode', '14091256');

    expect(field('cpf')).toHaveValue('529.982.247-25');
    expect(field('phone')).toHaveValue('(16) 99787-3407');
    expect(field('zipCode')).toHaveValue('14091-256');
  });

  it('confere o CPF pelos dígitos verificadores', async () => {
    renderForm(PATHS.PATIENT_NEW);
    await fillRequired();
    type('cpf', '529.982.247-26');

    save();

    expect(await screen.findByText(errors.cpf.invalid)).toBeInTheDocument();
  });

  it('inclui condições secundárias uma a uma', async () => {
    renderForm(PATHS.PATIENT_NEW);
    await screen.findByRole('heading', { level: 1, name: content.newTitle });
    const input = field('secondaryConditions');

    fireEvent.change(input, { target: { value: 'Diabetes tipo 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(
      screen.getByRole('button', { name: 'Diabetes tipo 2' }),
    ).toBeInTheDocument();
  });

  it('cadastra o paciente e abre o detalhe dele', async () => {
    const router = renderForm(PATHS.PATIENT_NEW);
    await fillRequired();
    type('cpf', '52998224725');

    save();

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(
        /^\/pacientes\/[0-9a-f-]{36}$/,
      ),
    );
  });

  it('aponta o CPF repetido no campo e sugere a busca, inclusive entre inativos', async () => {
    renderForm(PATHS.PATIENT_NEW);
    await fillRequired();
    type('cpf', ALZIRA_CPF);

    save();

    expect(await screen.findByText(errors.cpf.duplicate)).toBeInTheDocument();
    expect(screen.getByText(content.duplicateCpf)).toBeVisible();
    expect(
      screen.getByRole('link', { name: content.searchInactive }),
    ).toHaveAttribute(
      'href',
      `${PATHS.PATIENTS}?busca=00722169990&situacao=inactive`,
    );

    type('cpf', '52998224725');

    expect(screen.queryByText(errors.cpf.duplicate)).toBeNull();
  });

  it('orienta quando o plano atingiu o limite de pacientes', async () => {
    renderForm(PATHS.PATIENT_NEW);
    await fillRequired();
    failNextRequest(
      new ApiError({
        status: 409,
        code: 'PATIENT_PLAN_LIMIT_REACHED',
        message: 'Limite atingido.',
      }),
    );

    save();

    expect(
      await screen.findByText(content.planLimitReached),
    ).toBeInTheDocument();
  });

  it('volta à lista pelo Cancelar', async () => {
    const router = renderForm(PATHS.PATIENT_NEW);
    await screen.findByRole('heading', { level: 1, name: content.newTitle });

    fireEvent.click(screen.getByRole('link', { name: content.cancel }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PATIENTS),
    );
  });
});

describe('PatientFormPage na edição', () => {
  it('carrega o paciente, salva a alteração e volta ao detalhe', async () => {
    const router = renderForm(patientPath(DIRCE, 'edit'));

    await waitFor(() =>
      expect(field('name')).toHaveValue('Dirce Albuquerque Moraes'),
    );
    expect(field('cpf')).toHaveValue('040.646.054-03');
    expect(
      await within(
        screen.getByRole('combobox', {
          name: new RegExp(labels.responsibleUserId),
        }),
      ).findByText(/Rafael Moura Brandão/),
    ).toBeInTheDocument();

    type('phone', '16990001111');
    save();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(patientPath(DIRCE)),
    );
  });

  it('espera a lista de responsáveis para mostrar o escolhido', async () => {
    const { listEligibleUsers: original } = await vi.importActual(
      '../../../src/services/patientLinkService.js',
    );
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    listEligibleUsers.mockImplementationOnce(async (query) => {
      await gate;
      return original(query);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderForm(patientPath(DIRCE, 'edit'));

    await waitFor(() =>
      expect(field('name')).toHaveValue('Dirce Albuquerque Moraes'),
    );
    const responsible = screen.getByRole('combobox', {
      name: new RegExp(labels.responsibleUserId),
    });
    expect(responsible).toHaveAttribute('aria-disabled', 'true');
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('out-of-range'),
    );

    release();
    expect(
      await within(responsible).findByText(/Rafael Moura Brandão/),
    ).toBeInTheDocument();
    expect(responsible).not.toHaveAttribute('aria-disabled');
  });

  it('não abre a edição de paciente inativo', async () => {
    renderForm(patientPath(ALZIRA_INACTIVE, 'edit'));

    expect(await screen.findByText(content.inactive)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: content.save })).toBeNull();
    expect(
      screen.getByRole('link', { name: content.backToDetail }),
    ).toHaveAttribute('href', patientPath(ALZIRA_INACTIVE));
  });
});

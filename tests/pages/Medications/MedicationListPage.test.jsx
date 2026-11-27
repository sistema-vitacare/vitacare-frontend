import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PATHS, medicationsPath } from '../../../src/constants/routes.js';
import {
  medicationCardContent as cards,
  medicationDialogContent as dialogContent,
  medicationFieldErrors as fieldErrors,
  medicationListContent as list,
} from '../../../src/data/medicationPages.js';
import MedicationListPage from '../../../src/pages/Medications/MedicationListPage.jsx';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  AAS,
  BENEDITO,
  DIRCE,
  HIDROCLOROTIAZIDA,
  IOLANDA,
  LOSARTANA,
  allMedications,
  apiMedication,
  medicationRoutes,
} from '../../support/fixtures/medications.js';
import {
  activePatients,
  apiPatient,
  patientRoutes,
} from '../../support/fixtures/patients.js';

const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const DIPIRONA = 'a7e40000-0000-5000-8000-000000000001';
const LIST = 'GET /medications';
const DEACTIVATE = 'POST /medications/:medicationId/deactivate';
const REACTIVATE = 'POST /medications/:medicationId/reactivate';

// O que a API devolve na lista; o teste que grava muda esta lista, como a API
// faria, e a tela a pede de novo.
let medications;

function change(medicationId, changes) {
  const index = medications.findIndex(({ id }) => id === medicationId);
  medications[index] = { ...medications[index], ...changes };
  return { data: medications[index], meta: {} };
}

function renderList(profile, path = PATHS.MEDICATIONS, width = 1440) {
  return renderPage(
    [{ path: PATHS.MEDICATIONS, element: <MedicationListPage /> }],
    { profile, path, width },
  );
}

const card = (name) => screen.getByRole('article', { name });

function dialog() {
  return screen.getByRole('dialog');
}

function field(label) {
  return within(dialog()).getByLabelText(label, { exact: false });
}

function choose(label, option) {
  fireEvent.mouseDown(within(dialog()).getByRole('combobox', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

afterEach(() => {
  resetViewport();
});

beforeEach(() => {
  medications = allMedications();
  apiStub().use({ ...patientRoutes(), ...medicationRoutes(medications) });
});

describe('MedicationListPage', () => {
  it('pede o paciente e mostra os cartões dele, só para leitura, ao cuidador', async () => {
    renderList('caregiver');

    expect(
      await screen.findByText(list.picker.choosePatient),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: list.picker.patient }),
      { target: { value: 'Dirce' } },
    );
    fireEvent.click(
      await screen.findByRole('option', { name: 'Dirce Albuquerque Moraes' }),
    );

    expect(await screen.findByText(list.count(4))).toBeInTheDocument();
    expect(apiStub().last(LIST).query).toEqual({
      patientId: DIRCE,
      limit: '100',
    });
    expect(card('Losartana potássica 50 mg')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: list.add }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: cards.edit }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: cards.deactivate }),
    ).not.toBeInTheDocument();
  });

  it('mostra dose, horários, via, início, lembretes e o horário coincidente', async () => {
    renderList('professional', medicationsPath(DIRCE));

    const losartana = await screen.findByRole('article', {
      name: 'Losartana potássica 50 mg',
    });
    expect(within(losartana).getByText('1 comprimido')).toBeVisible();
    expect(
      within(losartana).getByText(cards.timesPerDay(['08:00', '20:00'])),
    ).toBeVisible();
    expect(within(losartana).getByText(cards.route('Oral'))).toBeVisible();
    expect(within(losartana).getByText(/^Desde 01\/10\/2026/)).toBeVisible();
    expect(within(losartana).getByText(/^Próximo horário:/)).toBeVisible();
    expect(within(losartana).getByText(cards.remindersOn)).toBeVisible();
    expect(
      within(losartana).getByText(
        cards.conflict([
          { medicationName: 'Hidroclorotiazida 25 mg', time: '08:00' },
        ]),
      ),
    ).toBeVisible();

    const inactive = card('Sinvastatina 20 mg');
    expect(
      within(inactive).getByText(cards.inactiveSince('20/10/2026')),
    ).toBeVisible();
    expect(within(inactive).getByText(cards.status.inactive)).toBeVisible();
    expect(
      within(inactive).getByRole('button', { name: cards.reactivate }),
    ).toBeVisible();
    expect(
      within(inactive).queryByRole('button', { name: cards.edit }),
    ).not.toBeInTheDocument();
  });

  it('mostra o intervalo em dias e o medicamento sem lembrete', async () => {
    renderList('professional', medicationsPath(BENEDITO));

    const weekly = await screen.findByRole('article', {
      name: 'Colecalciferol 7.000 UI',
    });
    expect(within(weekly).getByText(/a cada 7 dias/)).toBeVisible();
    expect(within(weekly).getByText(cards.remindersOff)).toBeVisible();
  });

  it('mostra o tratamento encerrado sem próximo horário', async () => {
    renderList('professional', medicationsPath(IOLANDA));

    const ended = await screen.findByRole('article', {
      name: 'Amoxicilina 500 mg',
    });
    expect(within(ended).getByText(cards.ended('26/10/2026'))).toBeVisible();
    expect(
      within(ended).queryByText(/^Próximo horário:/),
    ).not.toBeInTheDocument();
  });

  it('cadastra com os campos inválidos destacados antes e avisa o horário coincidente que a API devolve', async () => {
    apiStub().use({
      'POST /medications': ({ body }) => {
        const created = apiMedication(DIPIRONA, DIRCE, body.name, {
          doseAmount: body.doseAmount,
          schedule: { times: body.times },
          scheduleConflicts: [
            {
              medicationId: AAS,
              medicationName: 'Ácido acetilsalicílico 100 mg',
              time: '13:00',
            },
          ],
        });
        medications.push(created);
        return { data: created, meta: {} };
      },
    });
    renderList('professional', medicationsPath(DIRCE));
    fireEvent.click(await screen.findByRole('button', { name: list.add }));
    await screen.findByRole('dialog');

    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    expect(
      within(dialog()).getByText(dialogContent.invalidFields),
    ).toBeVisible();
    expect(within(dialog()).getByText(fieldErrors.name.default)).toBeVisible();
    expect(
      within(dialog()).getByText(fieldErrors.doseAmount.default),
    ).toBeVisible();
    expect(
      within(dialog()).getByText(fieldErrors.doseUnit.default),
    ).toBeVisible();
    expect(
      within(dialog()).getByText(fieldErrors.times.ARRAY_MIN_SIZE),
    ).toBeVisible();
    expect(apiStub().last('POST /medications')).toBeUndefined();

    fireEvent.change(field(dialogContent.name), {
      target: { value: 'Dipirona 500 mg' },
    });
    fireEvent.change(field(dialogContent.dose), { target: { value: '0,5' } });
    choose(dialogContent.doseUnit, 'comprimido');
    fireEvent.change(field(dialogContent.time(0)), {
      target: { value: '13:00' },
    });
    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiStub().last('POST /medications').body).toMatchObject({
      patientId: DIRCE,
      name: 'Dipirona 500 mg',
      doseAmount: 0.5,
      doseUnit: 'tablet',
      times: ['13:00'],
    });
    expect(await screen.findByText(list.saved)).toBeVisible();
    expect(
      screen.getByText(
        list.conflicts([
          {
            time: '13:00',
            medicationName: 'Ácido acetilsalicílico 100 mg',
          },
        ]),
      ),
    ).toBeVisible();
    const created = await screen.findByRole('article', {
      name: 'Dipirona 500 mg',
    });
    expect(within(created).getByText('0,5 comprimido')).toBeVisible();
  });

  it('edita enviando só o campo alterado, com o Salvar desabilitado enquanto nada muda', async () => {
    apiStub().use({
      'PATCH /medications/:medicationId': ({ params, body }) =>
        change(params.medicationId, body),
    });
    renderList('professional', medicationsPath(DIRCE));
    const losartana = await screen.findByRole('article', {
      name: 'Losartana potássica 50 mg',
    });

    fireEvent.click(
      within(losartana).getByRole('button', { name: cards.edit }),
    );
    await screen.findByRole('dialog');
    const save = within(dialog()).getByRole('button', {
      name: dialogContent.save,
    });

    expect(field(dialogContent.name)).toHaveValue('Losartana potássica 50 mg');
    expect(save).toBeDisabled();
    fireEvent.change(field(dialogContent.name), {
      target: { value: 'Losartana potássica 100 mg' },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    expect(
      await screen.findByRole('article', {
        name: 'Losartana potássica 100 mg',
      }),
    ).toBeVisible();
    expect(apiStub().last('PATCH /medications/:medicationId')).toMatchObject({
      params: { medicationId: LOSARTANA },
      body: { name: 'Losartana potássica 100 mg' },
    });
    expect(
      Object.keys(apiStub().last('PATCH /medications/:medicationId').body),
    ).toEqual(['name']);
  });

  it('inativa com confirmação, mostra a lista que a API devolve depois e reativa', async () => {
    apiStub().use({
      [DEACTIVATE]: ({ params }) => {
        change(LOSARTANA, { scheduleConflicts: [] });
        return change(params.medicationId, {
          status: 'inactive',
          nextScheduledAt: null,
          scheduleConflicts: [],
          deactivatedAt: '2026-11-25T13:00:00.000Z',
        });
      },
      [REACTIVATE]: ({ params }) =>
        change(params.medicationId, { status: 'active', deactivatedAt: null }),
    });
    renderList('professional', medicationsPath(DIRCE));
    const hydro = await screen.findByRole('article', {
      name: 'Hidroclorotiazida 25 mg',
    });

    fireEvent.click(
      within(hydro).getByRole('button', { name: cards.deactivate }),
    );
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText(list.deactivateDialog.text)).toBeVisible();
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: list.deactivateDialog.confirm,
      }),
    );

    expect(await screen.findByText(list.deactivated)).toBeVisible();
    expect(apiStub().last(DEACTIVATE).params.medicationId).toBe(
      HIDROCLOROTIAZIDA,
    );
    await waitFor(() =>
      expect(
        within(card('Losartana potássica 50 mg')).queryByText(/Mesmo horário/),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      within(card('Hidroclorotiazida 25 mg')).getByRole('button', {
        name: cards.reactivate,
      }),
    );
    expect(await screen.findByText(list.reactivated)).toBeVisible();
    expect(apiStub().last(REACTIVATE).params.medicationId).toBe(
      HIDROCLOROTIAZIDA,
    );
  });

  it('explica o medicamento que saiu do alcance ao inativar', async () => {
    apiStub().use({
      [DEACTIVATE]: () =>
        apiFailure(404, 'MEDICATION_NOT_FOUND', 'Medicamento não encontrado.'),
    });
    renderList('professional', medicationsPath(DIRCE));
    const hydro = await screen.findByRole('article', {
      name: 'Hidroclorotiazida 25 mg',
    });

    fireEvent.click(
      within(hydro).getByRole('button', { name: cards.deactivate }),
    );
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: list.deactivateDialog.confirm,
      }),
    );

    expect(
      await within(confirm).findByText(list.errors.MEDICATION_NOT_FOUND),
    ).toBeVisible();
  });

  it('com o paciente inativo, só deixa inativar e explica por quê', async () => {
    apiStub().use(
      patientRoutes(
        activePatients().filter((patient) => patient.id !== DIRCE),
        [apiPatient(DIRCE, { status: 'inactive' })],
      ),
    );
    renderList('professional', medicationsPath(DIRCE));

    expect(await screen.findByText(list.inactivePatient)).toBeVisible();
    expect(
      await screen.findAllByRole('button', { name: cards.deactivate }),
    ).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: list.add }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: cards.edit }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: cards.reactivate }),
    ).not.toBeInTheDocument();
  });

  it('mostra a lista vazia do paciente sem medicamentos', async () => {
    renderList('professional', medicationsPath(CLEUSA));

    expect(await screen.findByText(list.empty)).toBeVisible();
  });

  it('abre o diálogo em tela cheia no celular', async () => {
    renderList('professional', medicationsPath(DIRCE), 375);
    fireEvent.click(await screen.findByRole('button', { name: list.add }));

    const opened = await screen.findByRole('dialog');
    expect(opened.className).toMatch(/fullScreen/i);
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, medicationsPath } from '../../../src/constants/routes.js';
import {
  medicationCardContent as cards,
  medicationDialogContent as dialogContent,
  medicationFieldErrors as fieldErrors,
  medicationListContent as list,
} from '../../../src/data/medicationPages.js';
import MedicationListPage from '../../../src/pages/Medications/MedicationListPage.jsx';
import { startDemoSession } from '../../../src/services/authService.js';
import { resetMockState } from '../../../src/services/mockApi.js';
import { deactivatePatient } from '../../../src/services/patientService.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';

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
  resetMockState();
  resetViewport();
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

  it('cadastra com os campos inválidos destacados antes e avisa o horário coincidente depois de salvar', async () => {
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

  it('edita com o Salvar desabilitado enquanto nada muda', async () => {
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
  });

  it('inativa com confirmação, tira o horário coincidente do outro e reativa', async () => {
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
  });

  it('com o paciente inativo, só deixa inativar e explica por quê', async () => {
    await startDemoSession('admin');
    await deactivatePatient(DIRCE);
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

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  alertsPath,
  medicationsPath,
  patientPath,
  reportsPath,
} from '../../../src/constants/routes.js';
import { careTeamContent } from '../../../src/data/careTeam.js';
import { patientDetailContent as content } from '../../../src/data/patientDetail.js';
import { maskedFieldText } from '../../../src/data/patientFields.js';
import PatientDetailPage from '../../../src/pages/Patients/PatientDetailPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { ageFromBirthDate } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

function renderDetail(patientId, profile = 'professional') {
  return renderPage(
    [
      { path: PATHS.PATIENT_DETAIL, element: <PatientDetailPage /> },
      { path: PATHS.PATIENT_EDIT, element: <p>Edição</p> },
      { path: PATHS.PATIENT_HISTORY, element: <p>Histórico</p> },
      { path: PATHS.PATIENTS, element: <p>Lista</p> },
    ],
    { profile, path: patientPath(patientId) },
  );
}

async function heading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

function card(title) {
  return screen.getByRole('heading', { name: title }).closest('.MuiCard-root');
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('PatientDetailPage', () => {
  it('identifica o paciente com idade, sexo, CPF, condições, responsável e situação', async () => {
    renderDetail(DIRCE);

    await heading('Dirce Albuquerque Moraes');
    expect(
      screen.getByText(`${ageFromBirthDate('1941-05-17')} anos · Feminino`),
    ).toBeInTheDocument();
    expect(screen.getByText('CPF: 040.646.054-03')).toBeInTheDocument();
    expect(screen.getByText('Hipertensão arterial')).toBeInTheDocument();
    expect(screen.getByText('Diabetes mellitus tipo 2')).toBeInTheDocument();
    expect(screen.getAllByText('Rafael Moura Brandão').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
  });

  it('resume os registros, as últimas medições, os medicamentos e os alertas', async () => {
    renderDetail(DIRCE);
    await heading('Dirce Albuquerque Moraes');

    const measurements = await waitFor(() => card(content.measurements.title));
    expect(
      within(measurements).getByText('Pressão sistólica'),
    ).toBeInTheDocument();
    expect(within(measurements).getByText('126 mmHg')).toBeInTheDocument();
    expect(
      within(card(content.medications.title)).getByText(
        'Losartana potássica 50 mg',
      ),
    ).toBeVisible();
    expect(
      within(card(content.alerts.title)).getByText(
        'Pressão sistólica acima de 160',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(content.counts.validFollowUps).parentElement,
    ).toHaveTextContent('27');
  });

  it('orienta quando o paciente ainda não tem registros', async () => {
    renderDetail(CLEUSA);

    expect(
      await screen.findByText(content.measurements.empty),
    ).toBeInTheDocument();
    expect(screen.getByText(content.medications.empty)).toBeInTheDocument();
  });

  it('mostra ao profissional as ações de histórico, edição e inativação, e a equipe', async () => {
    renderDetail(DIRCE);
    await heading('Dirce Albuquerque Moraes');

    expect(
      screen.getByRole('link', { name: content.actions.history }),
    ).toHaveAttribute('href', patientPath(DIRCE, 'history'));
    expect(
      screen.getByRole('link', { name: content.actions.edit }),
    ).toHaveAttribute('href', patientPath(DIRCE, 'edit'));
    expect(
      screen.getByRole('button', { name: content.actions.deactivate }),
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: content.actions.visit }),
    ).toBeNull();
    expect(
      await screen.findByRole('heading', { name: careTeamContent.title }),
    ).toBeVisible();
  });

  it('leva ao relatório do paciente quem gera relatório, e só ele', async () => {
    renderDetail(DIRCE);
    await heading('Dirce Albuquerque Moraes');

    expect(
      screen.getByRole('link', { name: content.actions.report }),
    ).toHaveAttribute('href', reportsPath(DIRCE));
  });

  it('não mostra o relatório a quem não gera relatório', async () => {
    renderDetail(DIRCE, 'caregiver');
    await heading('Dirce Albuquerque Moraes');

    expect(screen.queryByRole('link', { name: /Relatório/ })).toBeNull();
  });

  it('mostra à cuidadora o registro de visita e o histórico, sem editar, inativar nem equipe', async () => {
    renderDetail(DIRCE, 'caregiver');
    await heading('Dirce Albuquerque Moraes');

    expect(
      screen.getByRole('link', { name: content.actions.visit }),
    ).toHaveAttribute('href', patientPath(DIRCE, 'visit'));
    expect(
      screen.getByRole('link', { name: content.actions.history }),
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: content.actions.edit }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: content.actions.deactivate }),
    ).toBeNull();
    expect(
      screen.queryByRole('heading', { name: careTeamContent.title }),
    ).toBeNull();
  });

  it('leva aos medicamentos e aos alertas do paciente, também para a familiar', async () => {
    renderDetail(DIRCE, 'family');
    await heading('Dirce Albuquerque Moraes');

    expect(
      screen.getByRole('link', { name: content.actions.medications }),
    ).toHaveAttribute('href', medicationsPath(DIRCE));
    const alerts = await waitFor(() => card(content.alerts.title));
    expect(
      within(alerts).getByRole('link', { name: content.alerts.viewAll }),
    ).toHaveAttribute('href', alertsPath(DIRCE));
    // A dose sai no singular ou no plural da unidade, como na tela de
    // medicamentos.
    expect(
      within(card(content.medications.title)).getAllByText(/^1 comprimido · /),
    ).toHaveLength(3);
  });

  it('mostra à familiar os campos ocultos como não exibidos', async () => {
    renderDetail(DIRCE, 'family');
    await heading('Dirce Albuquerque Moraes');

    expect(screen.getByText(`CPF: ${maskedFieldText}`)).toBeInTheDocument();
    expect(screen.getByText('Filha')).toBeInTheDocument();
    expect(screen.queryByText('********')).toBeNull();
  });

  it('inativa depois da confirmação e passa a oferecer a reativação', async () => {
    renderDetail(DIRCE);
    await heading('Dirce Albuquerque Moraes');

    fireEvent.click(
      screen.getByRole('button', { name: content.actions.deactivate }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: content.deactivateDialog.title,
    });
    expect(
      within(dialog).getByText(content.deactivateDialog.text),
    ).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    expect(
      await screen.findByRole('button', { name: content.actions.reactivate }),
    ).toBeVisible();
    expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('link', { name: content.actions.edit }),
    ).toBeNull();
  });

  it('diz que o paciente não foi encontrado quando está fora do alcance', async () => {
    renderDetail(IOLANDA, 'caregiver');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.backToList }),
    ).toHaveAttribute('href', PATHS.PATIENTS);
  });
});

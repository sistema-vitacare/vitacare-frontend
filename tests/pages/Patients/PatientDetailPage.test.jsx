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
import { ageFromBirthDate, MASKED_VALUE } from '../../../src/utils/format.js';
import { apiFailure, apiPage, apiStub } from '../../support/apiStub.js';
import { apiPatient } from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const DEACTIVATE = 'POST /patients/:patientId/deactivate';

function medication(id, name) {
  return {
    id,
    name,
    doseAmount: 1,
    doseUnit: 'tablet',
    schedule: { times: ['08:00', '20:00'] },
    status: 'active',
  };
}

// Visão consolidada como a API a devolve (`patients-visao-consolidada.md`).
const OVERVIEW = {
  patientId: DIRCE,
  counts: { validFollowUps: 27, openAlerts: 1, activeMedications: 3 },
  lastVisitedAt: '2026-11-09T12:00:00.000Z',
  measurements: [
    {
      fieldKey: '7a5b3c1d-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
      name: 'Pressão sistólica',
      fieldType: 'number',
      unit: 'mmHg',
      section: 'Sinais vitais',
      form: { id: 'f1', name: 'Sinais vitais diários' },
      values: [
        { value: 126, visitedAt: '2026-11-09T12:00:00.000Z', followUpId: 'r2' },
        { value: 131, visitedAt: '2026-11-08T12:00:00.000Z', followUpId: 'r1' },
      ],
    },
  ],
  activeMedications: [
    medication('m1', 'Losartana potássica 50 mg'),
    medication('m2', 'Metformina 850 mg'),
    medication('m3', 'Sinvastatina 20 mg'),
  ],
  recentAlerts: [
    {
      id: 'a1',
      title: 'Pressão sistólica acima de 160',
      severity: 'critical',
      status: 'open',
      generatedAt: '2026-11-09T12:05:00.000Z',
    },
  ],
};

function familyView(patient) {
  const masked = Object.fromEntries(
    ['cpf', 'phone', 'email', 'healthPlan', 'notes'].map((field) => [
      field,
      MASKED_VALUE,
    ]),
  );
  const address = Object.fromEntries(
    Object.keys(patient.address).map((part) => [part, MASKED_VALUE]),
  );
  return {
    ...patient,
    ...masked,
    address,
    viewerLink: { role: 'family', linkType: 'Filha' },
  };
}

function renderDetail(
  patientId,
  profile = 'professional',
  { patient = apiPatient(patientId), overview = OVERVIEW, meta = {} } = {},
) {
  apiStub().use({
    'GET /patients/:patientId': () => ({ data: patient, meta: {} }),
    'GET /patients/:patientId/overview': () => ({ data: overview, meta }),
    'GET /patient-links': () => apiPage([]),
  });
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

  it('resume os registros, as últimas medições, os medicamentos e os alertas da visão consolidada', async () => {
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

  it('mostra a mensagem da API quando o paciente ainda não tem registros', async () => {
    const message = 'Este paciente ainda não tem registro de acompanhamento.';
    renderDetail(DIRCE, 'professional', {
      overview: {
        ...OVERVIEW,
        counts: { validFollowUps: 0, openAlerts: 0, activeMedications: 0 },
        lastVisitedAt: null,
        measurements: [],
        activeMedications: [],
        recentAlerts: [],
      },
      meta: { message },
    });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(content.measurements.empty)).toBeNull();
    expect(screen.getByText(content.medications.empty)).toBeInTheDocument();
  });

  it('não mostra os blocos que a API devolve como null, sem a permissão', async () => {
    renderDetail(DIRCE, 'professional', {
      overview: {
        ...OVERVIEW,
        counts: {
          validFollowUps: 27,
          openAlerts: null,
          activeMedications: null,
        },
        activeMedications: null,
        recentAlerts: null,
      },
    });
    await heading('Dirce Albuquerque Moraes');
    await waitFor(() => card(content.measurements.title));

    expect(
      screen.queryByRole('heading', { name: content.medications.title }),
    ).toBeNull();
    expect(
      screen.queryByRole('heading', { name: content.alerts.title }),
    ).toBeNull();
    expect(screen.queryByText(content.counts.openAlerts)).toBeNull();
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
    expect(apiStub().last('GET /patient-links')).toBeUndefined();
  });

  it('leva aos medicamentos e aos alertas do paciente, também para a familiar', async () => {
    renderDetail(DIRCE, 'family', { patient: familyView(apiPatient(DIRCE)) });
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

  it('mostra à familiar os campos que a API mascara como não exibidos', async () => {
    renderDetail(DIRCE, 'family', { patient: familyView(apiPatient(DIRCE)) });
    await heading('Dirce Albuquerque Moraes');

    expect(screen.getByText(`CPF: ${maskedFieldText}`)).toBeInTheDocument();
    expect(screen.getByText('Filha')).toBeInTheDocument();
    expect(screen.queryByText(MASKED_VALUE)).toBeNull();
  });

  it('inativa pela API depois da confirmação e passa a oferecer a reativação', async () => {
    let status = 'active';
    renderDetail(DIRCE);
    apiStub().use({
      'GET /patients/:patientId': () => ({
        data: apiPatient(DIRCE, { status }),
        meta: {},
      }),
      [DEACTIVATE]: () => {
        status = 'inactive';
        return { data: apiPatient(DIRCE, { status }), meta: {} };
      },
    });
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
    expect(apiStub().last(DEACTIVATE).params).toEqual({ patientId: DIRCE });
    expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('link', { name: content.actions.edit }),
    ).toBeNull();
  });

  it('explica a situação já mudada em outra aba', async () => {
    renderDetail(DIRCE);
    apiStub().use({
      [DEACTIVATE]: () =>
        apiFailure(
          409,
          'PATIENT_ALREADY_INACTIVE',
          'O paciente já está inativo.',
        ),
    });
    await heading('Dirce Albuquerque Moraes');

    fireEvent.click(
      screen.getByRole('button', { name: content.actions.deactivate }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: content.deactivateDialog.title,
    });
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    expect(
      await within(dialog).findByText(
        content.statusErrors.PATIENT_ALREADY_INACTIVE,
      ),
    ).toBeVisible();
  });

  it('diz que o paciente não foi encontrado quando a API responde 404', async () => {
    renderDetail(IOLANDA, 'caregiver');
    apiStub().use({
      'GET /patients/:patientId': () =>
        apiFailure(404, 'PATIENT_NOT_FOUND', 'Paciente não encontrado.'),
    });

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.backToList }),
    ).toHaveAttribute('href', PATHS.PATIENTS);
  });
});

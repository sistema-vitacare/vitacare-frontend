import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  alertPath,
  alertsPath,
  medicationsPath,
  recordPath,
} from '../../../src/constants/routes.js';
import {
  alertDetailContent as content,
  alertListContent as list,
  resolveAlertContent as resolve,
} from '../../../src/data/alertPages.js';
import AlertDetailPage from '../../../src/pages/Alerts/AlertDetailPage.jsx';
import {
  listPatientAlerts,
  resolveAlert,
} from '../../../src/services/alertService.js';
import { startDemoSession } from '../../../src/services/authService.js';
import {
  annulFollowUp,
  createFollowUp,
} from '../../../src/services/followUpService.js';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const ABSENCE = 'a1e70000-0000-5000-8009-000000000001';

function renderDetail(profile, alertId) {
  return renderPage(
    [{ path: PATHS.ALERT_DETAIL, element: <AlertDetailPage /> }],
    { profile, path: alertPath(alertId) },
  );
}

async function firstAlert(patientId, query) {
  await startDemoSession('professional');
  const { data } = await listPatientAlerts({ patientId, ...query });
  return data[0];
}

function section(title) {
  return screen.getByRole('heading', { name: title }).closest('.MuiCard-root');
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('AlertDetailPage', () => {
  it('mostra o alerta de valor registrado com campo, valor, condição, regra e registro de origem', async () => {
    const alert = await firstAlert(OSVALDO, {
      status: 'open',
      severity: 'warning',
    });
    renderDetail('professional', alert.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: alert.title }),
    ).toBeVisible();
    const reading = section(content.reading.title);
    expect(within(reading).getByText('Glicemia capilar')).toBeVisible();
    expect(within(reading).getByText(/^\d+ mg\/dL$/)).toBeVisible();
    expect(within(reading).getByText('maior que 180 mg/dL')).toBeVisible();
    expect(
      within(reading).getByRole('link', { name: /^Visita de / }),
    ).toHaveAttribute('href', recordPath(alert.followUp.id));
    expect(screen.getByRole('link', { name: 'Alertas' })).toHaveAttribute(
      'href',
      alertsPath(OSVALDO),
    );
  });

  it('marca o registro de origem anulado depois do alerta', async () => {
    await startDemoSession('caregiver');
    const { data: followUp } = await createFollowUp({
      patientId: DIRCE,
      formId: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
      formVersionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
      answers: [
        { fieldId: '3c44a6a8-5472-5c65-ad6a-42a6a946740e', value: 172 },
        { fieldId: '9570caa1-28fc-5e06-8327-bac0266a6c63', value: 95 },
      ],
    });
    await annulFollowUp(followUp.id, { reason: 'Valor digitado errado.' });
    const { data } = await listPatientAlerts({ patientId: DIRCE });
    const alert = data.find((item) => item.followUp?.id === followUp.id);

    renderDetail('professional', alert.id);

    expect(await screen.findByText(content.reading.annulled)).toBeVisible();
  });

  it('mostra a ausência de registro com o formulário, os prazos e a frequência', async () => {
    renderDetail('professional', ABSENCE);

    const absence = await screen
      .findByRole('heading', { name: content.absence.title })
      .then((heading) => heading.closest('.MuiCard-root'));
    expect(within(absence).getByText('Sinais vitais')).toBeVisible();
    expect(
      within(absence).getByText(content.absence.every(1, 'semana')),
    ).toBeVisible();
    expect(within(absence).getByText(content.absence.since)).toBeVisible();
    expect(within(absence).getByText(content.absence.dueAt)).toBeVisible();
  });

  it('mostra o lembrete com o medicamento e o horário programado', async () => {
    const alert = await firstAlert(OSVALDO, { severity: 'info' });
    renderDetail('caregiver', alert.id);

    const reminder = await screen
      .findByRole('heading', { name: content.reminder.title })
      .then((heading) => heading.closest('.MuiCard-root'));
    expect(
      within(reminder).getByText(alert.medicationReminder.medication.name),
    ).toBeVisible();
    expect(
      within(reminder).getByRole('link', {
        name: content.reminder.openMedications,
      }),
    ).toHaveAttribute('href', medicationsPath(OSVALDO));
  });

  it('resolve pelo detalhe, com confirmação, e mostra quem resolveu', async () => {
    const alert = await firstAlert(DIRCE, { status: 'open' });
    renderDetail('caregiver', alert.id);

    fireEvent.click(
      await screen.findByRole('button', {
        name: resolve.resolveOf(alert.title),
      }),
    );
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: resolve.dialog.confirm,
      }),
    );

    expect(
      await screen.findByText(/^Resolvido por Rosângela Prado em /),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: resolve.resolveOf(alert.title) }),
    ).toBeNull();
  });

  it('avisa quando outra pessoa resolveu antes', async () => {
    const alert = await firstAlert(DIRCE, { status: 'open' });
    renderDetail('caregiver', alert.id);
    const button = await screen.findByRole('button', {
      name: resolve.resolveOf(alert.title),
    });

    await resolveAlert(alert.id);
    fireEvent.click(button);
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: resolve.dialog.confirm,
      }),
    );

    expect(await screen.findByText(list.alreadyResolved)).toBeVisible();
    expect(
      await screen.findByText(/^Resolvido por Rosângela Prado em /),
    ).toBeVisible();
  });

  it('não mostra Resolver à familiar', async () => {
    const alert = await firstAlert(DIRCE, { status: 'open' });
    renderDetail('family', alert.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: alert.title }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Resolver/ })).toBeNull();
  });

  it('diz quando o alerta não existe ou está fora do alcance', async () => {
    renderDetail('family', 'nao-existe');

    expect(await screen.findByText(content.notFound)).toBeVisible();
    expect(
      screen.getByRole('link', { name: content.backToAlerts }),
    ).toHaveAttribute('href', PATHS.ALERTS);
  });
});

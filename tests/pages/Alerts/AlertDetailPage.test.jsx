import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  ABSENCE,
  DIRCE,
  FOLLOW_UP,
  OSVALDO,
  READING,
  REMINDER,
  alertRoutes,
  allAlerts,
} from '../../support/fixtures/alerts.js';

const RESOLVE = 'POST /alerts/:alertId/resolve';

// O que a API devolve no detalhe; o teste que resolve muda esta lista, como a
// API faria, e a tela a pede de novo.
let alerts;

function change(alertId, changes) {
  const index = alerts.findIndex(({ id }) => id === alertId);
  alerts[index] = { ...alerts[index], ...changes };
  return { data: alerts[index], meta: {} };
}

const resolution = (name) => ({
  status: 'resolved',
  resolution: {
    resolvedAt: '2026-11-25T13:00:00.000Z',
    resolvedBy: { id: `u-${name}`, name },
  },
});

function renderDetail(profile, alertId) {
  return renderPage(
    [{ path: PATHS.ALERT_DETAIL, element: <AlertDetailPage /> }],
    { profile, path: alertPath(alertId) },
  );
}

function section(title) {
  return screen.getByRole('heading', { name: title }).closest('.MuiCard-root');
}

async function confirmResolve(title) {
  fireEvent.click(
    await screen.findByRole('button', { name: resolve.resolveOf(title) }),
  );
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: resolve.dialog.confirm,
    }),
  );
}

afterEach(() => {
  resetViewport();
});

beforeEach(() => {
  alerts = allAlerts();
  apiStub().use(alertRoutes(alerts));
});

describe('AlertDetailPage', () => {
  it('mostra o alerta de valor registrado com campo, valor, condição, regra, registro de origem e quem registrou', async () => {
    renderDetail('professional', READING);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Pressão sistólica acima de 160',
      }),
    ).toBeVisible();
    const reading = section(content.reading.title);
    expect(within(reading).getByText('Pressão sistólica')).toBeVisible();
    expect(within(reading).getByText('182 mmHg')).toBeVisible();
    expect(within(reading).getByText('maior que 160 mmHg')).toBeVisible();
    expect(
      within(reading).getByRole('link', { name: /^Visita de / }),
    ).toHaveAttribute('href', recordPath(FOLLOW_UP));
    expect(within(reading).getByText('Carla Mendes')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Alertas' })).toHaveAttribute(
      'href',
      alertsPath(DIRCE.id),
    );
  });

  it('marca o registro de origem anulado depois do alerta', async () => {
    change(READING, {
      followUp: { ...alerts[0].followUp, status: 'annulled' },
    });
    renderDetail('professional', READING);

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
    renderDetail('caregiver', REMINDER);

    const reminder = await screen
      .findByRole('heading', { name: content.reminder.title })
      .then((heading) => heading.closest('.MuiCard-root'));
    expect(within(reminder).getByText('Metformina 850 mg')).toBeVisible();
    expect(
      within(reminder).getByRole('link', {
        name: content.reminder.openMedications,
      }),
    ).toHaveAttribute('href', medicationsPath(OSVALDO.id));
  });

  it('resolve pelo detalhe, com confirmação, e mostra quem resolveu', async () => {
    apiStub().use({
      [RESOLVE]: ({ params }) =>
        change(params.alertId, resolution('Carla Mendes')),
    });
    renderDetail('caregiver', READING);

    await confirmResolve('Pressão sistólica acima de 160');

    expect(
      await screen.findByText(/^Resolvido por Carla Mendes em /),
    ).toBeVisible();
    expect(apiStub().last(RESOLVE).params.alertId).toBe(READING);
    expect(
      screen.queryByRole('button', {
        name: resolve.resolveOf('Pressão sistólica acima de 160'),
      }),
    ).toBeNull();
  });

  it('avisa quando outra pessoa resolveu antes e mostra a resolução dela', async () => {
    apiStub().use({
      [RESOLVE]: () => {
        change(READING, resolution('Rafael Moura Brandão'));
        return apiFailure(
          409,
          'ALERT_ALREADY_RESOLVED',
          'O alerta já foi resolvido.',
        );
      },
    });
    renderDetail('caregiver', READING);

    await confirmResolve('Pressão sistólica acima de 160');

    expect(await screen.findByText(list.alreadyResolved)).toBeVisible();
    expect(
      await screen.findByText(/^Resolvido por Rafael Moura Brandão em /),
    ).toBeVisible();
  });

  it('não mostra Resolver à familiar', async () => {
    renderDetail('family', READING);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Pressão sistólica acima de 160',
      }),
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

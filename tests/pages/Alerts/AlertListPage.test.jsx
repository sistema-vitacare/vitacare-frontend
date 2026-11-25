import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NotificationsProvider from '../../../src/components/NotificationsProvider.jsx';
import { PATHS, alertsPath } from '../../../src/constants/routes.js';
import {
  alertListContent as content,
  resolveAlertContent as resolve,
} from '../../../src/data/alertPages.js';
import AlertListPage from '../../../src/pages/Alerts/AlertListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiStub } from '../../support/apiStub.js';
import {
  DIRCE,
  OSVALDO,
  READING,
  alertRoutes,
  allAlerts,
} from '../../support/fixtures/alerts.js';
import { apiPatient, patientRoutes } from '../../support/fixtures/patients.js';

const LIST = 'GET /alerts';
const SUMMARY = 'GET /alerts/summary';
const RESOLVE = 'POST /alerts/:alertId/resolve';
const READ_ALL = 'POST /notifications/read-all';
const UNREAD = 'GET /notifications/unread-count';

// O que a API devolve; o teste que resolve muda esta lista, como a API faria,
// e a tela pede lista e resumo de novo.
let alerts;

function renderList(profile, path = PATHS.ALERTS) {
  return renderPage(
    [
      {
        path: PATHS.ALERTS,
        element: (
          <NotificationsProvider>
            <AlertListPage />
          </NotificationsProvider>
        ),
      },
    ],
    { profile, path },
  );
}

const tab = (label, count) =>
  screen.findByRole('tab', {
    name: count === undefined ? label : content.tabLabel(label, count),
  });

const items = () =>
  within(screen.getByRole('list', { name: content.listLabel })).getAllByRole(
    'listitem',
  );

function counter(label) {
  return within(screen.getByRole('list', { name: content.countersLabel }))
    .getByText(label)
    .closest('li');
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

beforeEach(() => {
  alerts = allAlerts();
  apiStub().use({ ...patientRoutes(), ...alertRoutes(alerts) });
});

describe('AlertListPage', () => {
  it('mostra os alertas de todos os pacientes sem pedir o paciente, com o resumo nos contadores e nas abas', async () => {
    renderList('professional');

    expect(await tab(content.tabs.open, 3)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(counter('Crítico')).toHaveTextContent('1');
    expect(counter('Atenção')).toHaveTextContent('1');
    expect(counter('Informativo')).toHaveTextContent('1');
    await waitFor(() => expect(items()).toHaveLength(3));
    expect(apiStub().last(SUMMARY).query).toEqual({});
    expect(apiStub().last(LIST).query).toEqual({
      status: 'open',
      sort: 'priority',
      page: '1',
      limit: '20',
    });
    const reading = items()[0];
    expect(
      within(reading).getByText(
        content.patient(DIRCE.name, DIRCE.mainCondition),
      ),
    ).toBeVisible();
    expect(
      within(reading).getByText(/Registrado por Carla Mendes/),
    ).toBeVisible();
    expect(
      within(items()[1]).queryByText(/Registrado por/),
    ).not.toBeInTheDocument();
  });

  it('filtra pelo paciente do endereço, no resumo e na lista', async () => {
    renderList('professional', alertsPath(OSVALDO.id));

    expect(await tab(content.tabs.open, 2)).toBeVisible();
    await waitFor(() => expect(items()).toHaveLength(2));
    expect(apiStub().last(SUMMARY).query).toEqual({ patientId: OSVALDO.id });
    expect(apiStub().last(LIST).query).toMatchObject({
      patientId: OSVALDO.id,
    });
  });

  it('guarda a aba no endereço e pede a severidade na ordem de prioridade', async () => {
    const router = renderList('professional');

    fireEvent.click(await tab(content.tabs.warning, 1));

    expect(router.state.location.search).toBe('?aba=atencao');
    await waitFor(() =>
      expect(apiStub().last(LIST).query).toMatchObject({
        status: 'open',
        severity: 'warning',
        sort: 'priority',
      }),
    );
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(
      within(items()[0]).getByText(/^Sem registro de Sinais vitais/),
    ).toBeVisible();
  });

  it('mostra nos resolvidos quem resolveu e quando', async () => {
    renderList('professional', `${PATHS.ALERTS}?aba=resolvidos`);

    expect(
      await screen.findByText(/^Resolvido por Rafael Moura Brandão em /),
    ).toBeVisible();
    expect(apiStub().last(LIST).query).toEqual({
      status: 'resolved',
      page: '1',
      limit: '20',
    });
    expect(screen.queryByRole('button', { name: /^Resolver/ })).toBeNull();
  });

  it('resolve com confirmação e pede de novo o resumo e a lista', async () => {
    apiStub().use({
      [RESOLVE]: ({ params }) => {
        const index = alerts.findIndex(({ id }) => id === params.alertId);
        alerts[index] = { ...alerts[index], status: 'resolved' };
        return { data: alerts[index], meta: {} };
      },
    });
    renderList('caregiver');
    expect(await tab(content.tabs.open, 3)).toBeVisible();

    fireEvent.click(
      (await screen.findAllByRole('button', { name: /^Resolver / }))[0],
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(resolve.dialog.text)).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', { name: resolve.dialog.confirm }),
    );

    expect(await screen.findByText(content.resolved)).toBeVisible();
    expect(apiStub().last(RESOLVE).params.alertId).toBe(READING);
    expect(await tab(content.tabs.open, 2)).toBeVisible();
    expect(counter('Crítico')).toHaveTextContent('0');
  });

  it('mostra os alertas à familiar, sem o botão de resolver', async () => {
    apiStub().use(patientRoutes([apiPatient(DIRCE.id)]));
    renderList('family');

    expect(await tab(content.tabs.open, 3)).toBeVisible();
    await waitFor(() => expect(items()).toHaveLength(3));
    expect(screen.queryByRole('button', { name: /^Resolver/ })).toBeNull();
  });

  it('mostra a aba vazia com mensagem', async () => {
    renderList('professional', alertsPath(OSVALDO.id));

    fireEvent.click(await tab(content.tabs.critical, 0));

    expect(await screen.findByText(content.empty.critical)).toBeVisible();
  });

  it('marca como lidas as notificações do paciente do filtro e pede o contador do sino de novo', async () => {
    let unread = 2;
    apiStub().use({
      [UNREAD]: () => ({ data: { unread }, meta: {} }),
      [READ_ALL]: () => {
        unread = 0;
        return { data: { updated: 2 }, meta: {} };
      },
    });
    renderList('caregiver', alertsPath(DIRCE.id));
    const button = await screen.findByRole('button', { name: content.readAll });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    expect(await screen.findByText(content.allRead(2))).toBeVisible();
    expect(apiStub().last(READ_ALL).body).toEqual({ patientId: DIRCE.id });
    await waitFor(() => expect(button).toBeDisabled());
  });
});

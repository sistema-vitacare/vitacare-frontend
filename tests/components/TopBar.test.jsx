import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NotificationsProvider from '../../src/components/NotificationsProvider.jsx';
import TopBar from '../../src/components/TopBar.jsx';
import { PATHS, alertPath } from '../../src/constants/routes.js';
import { notificationBellContent as bell } from '../../src/data/alertPages.js';
import { changePasswordContent } from '../../src/data/access.js';
import { profileLabels } from '../../src/data/profiles.js';
import { topBarSearchContent } from '../../src/data/patientList.js';
import { renderPage } from '../support/renderPage.jsx';
import { resetViewport } from '../support/viewport.js';
import { apiPage, apiStub } from '../support/apiStub.js';
import { allAlerts, apiNotification } from '../support/fixtures/alerts.js';

const PROFILES = [
  'admin',
  'professional',
  'caregiver',
  'family',
  'platform_admin',
];

function renderTopBar(profile) {
  return renderPage(
    [
      { path: PATHS.DASHBOARD, element: <TopBar /> },
      { path: PATHS.PATIENTS, element: <p>Lista</p> },
    ],
    { profile, path: PATHS.DASHBOARD },
  );
}

afterEach(() => {
  resetViewport();
});

describe('busca da barra superior', () => {
  it('abre a listagem de pacientes com o termo aplicado', async () => {
    const router = renderTopBar('admin');
    const field = await screen.findByRole('searchbox', {
      name: topBarSearchContent.label,
    });

    fireEvent.change(field, { target: { value: 'dirce' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PATIENTS),
    );
    expect(router.state.location.search).toBe('?busca=dirce');
  });

  it('leva a busca por CPF pelo estado da rota, fora do endereço', async () => {
    const router = renderTopBar('admin');
    const field = await screen.findByRole('searchbox', {
      name: topBarSearchContent.label,
    });

    fireEvent.change(field, { target: { value: '040.646.054-03' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PATIENTS),
    );
    expect(router.state.location.search).toBe('');
    expect(router.state.location.state).toEqual({ search: '040.646.054-03' });
  });

  it('não aparece para quem não lê pacientes', async () => {
    renderTopBar('platform_admin');
    await screen.findByRole('banner');

    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('menu do usuário', () => {
  it.each(PROFILES)(
    'oferece "Alterar senha" e "Sair" ao perfil %s',
    async (profile) => {
      renderTopBar(profile);

      fireEvent.click(
        await screen.findByRole('button', {
          name: new RegExp(profileLabels[profile]),
        }),
      );

      expect(
        await screen.findByRole('menuitem', {
          name: changePasswordContent.menuItem,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Sair' }),
      ).toBeInTheDocument();
    },
  );

  it('abre a troca de senha pelo menu', async () => {
    renderTopBar('caregiver');

    fireEvent.click(
      await screen.findByRole('button', { name: /Rosângela Prado/ }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: changePasswordContent.menuItem,
      }),
    );

    expect(
      await screen.findByRole('dialog', { name: changePasswordContent.title }),
    ).toBeInTheDocument();
  });
});

describe('sino de notificações', () => {
  const UNREAD = 'GET /notifications/unread-count';
  const BOX = 'GET /notifications';
  const READ = 'POST /notifications/:notificationId/read';
  const READ_ALL = 'POST /notifications/read-all';
  const [reading, absence] = allAlerts();
  const UNREAD_ID = 'b0710000-0000-5000-8000-000000000001';

  // O sino lê o contador do provedor que o AppShell monta.
  function renderBell(profile) {
    return renderPage(
      [
        {
          path: PATHS.DASHBOARD,
          element: (
            <NotificationsProvider>
              <TopBar />
            </NotificationsProvider>
          ),
        },
        { path: PATHS.ALERT_DETAIL, element: <p>Detalhe do alerta</p> },
      ],
      { profile, path: PATHS.DASHBOARD },
    );
  }

  function stubInbox(unread) {
    let count = unread;
    apiStub().use({
      [UNREAD]: () => ({ data: { unread: count }, meta: {} }),
      [BOX]: () =>
        apiPage([
          apiNotification(UNREAD_ID, reading),
          apiNotification('b0710000-0000-5000-8000-000000000002', absence, {
            readAt: '2026-11-24T12:00:00.000Z',
          }),
        ]),
      [READ]: () => {
        count -= 1;
        return { data: null, meta: {} };
      },
      [READ_ALL]: () => {
        count = 0;
        return { data: { updated: unread }, meta: {} };
      },
    });
  }

  it('mostra o número de notificações não lidas do próprio usuário', async () => {
    stubInbox(3);
    renderBell('caregiver');

    expect(
      await screen.findByRole('button', { name: bell.open(3) }),
    ).toBeVisible();
  });

  it('não aparece para quem não lê alertas, nem pede o contador', async () => {
    renderBell('platform_admin');

    expect(
      await screen.findByRole('button', {
        name: /Administrador da plataforma/,
      }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: bell.open(0) })).toBeNull();
    expect(apiStub().last(UNREAD)).toBeUndefined();
  });

  it('abre a caixa, marca a notificação como lida e leva ao alerta', async () => {
    stubInbox(1);
    const router = renderBell('caregiver');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificações, 1 não lida' }),
    );
    const box = await screen.findByRole('dialog', { name: bell.title });
    expect(
      within(box).getByText(`(${bell.unread})`, { exact: false }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(box).getByRole('button', { name: new RegExp(reading.title) }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(alertPath(reading.id)),
    );
    expect(apiStub().last(READ).params.notificationId).toBe(UNREAD_ID);
  });

  it('leva ao alerta da notificação já lida sem marcar de novo', async () => {
    stubInbox(1);
    const router = renderBell('caregiver');

    fireEvent.click(await screen.findByRole('button', { name: bell.open(1) }));
    const box = await screen.findByRole('dialog', { name: bell.title });
    fireEvent.click(
      await within(box).findByRole('button', {
        name: new RegExp(absence.title),
      }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(alertPath(absence.id)),
    );
    expect(apiStub().last(READ)).toBeUndefined();
  });

  it('marca todas como lidas e zera o contador', async () => {
    stubInbox(2);
    renderBell('caregiver');

    fireEvent.click(await screen.findByRole('button', { name: bell.open(2) }));
    const box = await screen.findByRole('dialog', { name: bell.title });
    fireEvent.click(
      await within(box).findByRole('button', { name: bell.readAll }),
    );

    // A caixa aberta é modal e esconde o sino dos leitores de tela.
    expect(
      await screen.findByRole('button', { name: bell.open(0), hidden: true }),
    ).toBeInTheDocument();
    expect(apiStub().last(READ_ALL).body).toEqual({});
    expect(
      within(box).getByRole('button', { name: bell.readAll }),
    ).toBeDisabled();
  });
});

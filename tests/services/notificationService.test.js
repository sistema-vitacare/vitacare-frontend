import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  countUnreadNotifications,
  listNotifications,
  readAllNotifications,
  readNotification,
} from '../../src/services/notificationService.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import {
  DIRCE,
  allAlerts,
  apiNotification,
} from '../support/fixtures/alerts.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('caregiver').id}`;
const NOTIFICATION_ID = 'b0710000-0000-5000-8000-000000000001';
const NOTIFICATION = apiNotification(NOTIFICATION_ID, allAlerts()[0]);

async function signIn() {
  await login(credentialsFor('caregiver'));
}

afterEach(() => {
  resetMockState();
});

describe('notificationService', () => {
  it('lista a caixa do próprio usuário e conta as não lidas, com o token da sessão', async () => {
    await signIn();
    apiStub().use({
      'GET /notifications': () => apiPage([NOTIFICATION]),
      'GET /notifications/unread-count': () => ({
        data: { unread: 3 },
        meta: {},
      }),
    });

    const { data } = await listNotifications({ limit: 10 });
    const count = await countUnreadNotifications();

    expect(data).toEqual([NOTIFICATION]);
    expect(count.data.unread).toBe(3);
    expect(apiStub().last('GET /notifications')).toMatchObject({
      query: { limit: '10' },
      token: TOKEN,
    });
    expect(apiStub().last('GET /notifications/unread-count').token).toBe(TOKEN);
  });

  it('marca uma como lida e todas, com o paciente no corpo quando há filtro', async () => {
    await signIn();
    apiStub().use({
      'POST /notifications/:notificationId/read': () => ({
        data: { ...NOTIFICATION, readAt: '2026-11-25T12:00:00.000Z' },
        meta: {},
      }),
      'POST /notifications/read-all': () => ({
        data: { updated: 2 },
        meta: {},
      }),
    });

    await readNotification(NOTIFICATION_ID);
    await readAllNotifications();
    const filtered = await readAllNotifications({ patientId: DIRCE.id });

    expect(filtered.data.updated).toBe(2);
    expect(
      apiStub().last('POST /notifications/:notificationId/read').params,
    ).toEqual({ notificationId: NOTIFICATION_ID });
    expect(
      apiStub()
        .requests.filter(({ key }) => key === 'POST /notifications/read-all')
        .map(({ body }) => body),
    ).toEqual([{}, { patientId: DIRCE.id }]);
  });

  it('devolve o erro da API com o código, como a notificação de outro usuário', async () => {
    await signIn();
    apiStub().use({
      'POST /notifications/:notificationId/read': () =>
        apiFailure(
          404,
          'NOTIFICATION_NOT_FOUND',
          'Notificação não encontrada.',
        ),
    });

    await expect(readNotification(NOTIFICATION_ID)).rejects.toMatchObject({
      status: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await readNotification('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe(
      '/notifications/..%2Fusers/read',
    );
  });
});

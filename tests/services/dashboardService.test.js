import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  DASHBOARD_ERROR_CODES,
  getDashboard,
  getDashboardAlerts,
  getDashboardFollowUps,
  getDashboardPatients,
  getDashboardUsers,
} from '../../src/services/dashboardService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { apiFailure, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('admin').id}`;
const PERIOD = { from: '2026-10-01', to: '2026-10-31' };
const PLAN_MESSAGE =
  'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.';

async function signIn() {
  await login(credentialsFor('admin'));
}

afterEach(() => {
  resetMockState();
});

describe('dashboardService', () => {
  it('pede o painel pela API, com o período na query e o token da sessão', async () => {
    await signIn();
    const summary = { patients: { active: 3, newInPeriod: 1 } };
    apiStub().use({ 'GET /dashboard': () => ({ data: summary, meta: {} }) });

    const { data } = await getDashboard(PERIOD);

    expect(data).toEqual(summary);
    expect(apiStub().last('GET /dashboard')).toMatchObject({
      query: PERIOD,
      token: TOKEN,
    });
  });

  it('pede o detalhe de cada indicador pela rota dele, com o período onde a API o aceita', async () => {
    await signIn();
    apiStub().use({
      'GET /dashboard/patients': () => ({ data: { active: 1 }, meta: {} }),
      'GET /dashboard/users': () => ({ data: { active: 2 }, meta: {} }),
      'GET /dashboard/follow-ups': () => ({ data: { inPeriod: 3 }, meta: {} }),
      'GET /dashboard/alerts': () => ({
        data: { issuedInPeriod: 4 },
        meta: {},
      }),
    });

    const answers = [
      await getDashboardPatients(PERIOD),
      await getDashboardUsers(),
      await getDashboardFollowUps(PERIOD),
      await getDashboardAlerts(PERIOD),
    ];

    expect(answers.map(({ data }) => Object.values(data)[0])).toEqual([
      1, 2, 3, 4,
    ]);
    expect(apiStub().last('GET /dashboard/patients').query).toEqual(PERIOD);
    expect(apiStub().last('GET /dashboard/users').query).toEqual({});
    expect(apiStub().last('GET /dashboard/follow-ups').query).toEqual(PERIOD);
    expect(apiStub().last('GET /dashboard/alerts').query).toEqual(PERIOD);
  });

  it('entrega a mensagem da API do período sem registro', async () => {
    await signIn();
    const message = 'Nenhum registro de acompanhamento no período selecionado.';
    apiStub().use({
      'GET /dashboard': () => ({
        data: { followUps: { inPeriod: 0 } },
        meta: { message },
      }),
    });

    const { meta } = await getDashboard(PERIOD);

    expect(meta.message).toBe(message);
  });

  it('repassa o 403 do plano sem o painel com o código da API', async () => {
    await signIn();
    apiStub().use({
      'GET /dashboard': () =>
        apiFailure(403, DASHBOARD_ERROR_CODES.PLAN_UNAVAILABLE, PLAN_MESSAGE),
    });

    await expect(getDashboard(PERIOD)).rejects.toMatchObject({
      status: 403,
      code: 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE',
      message: PLAN_MESSAGE,
    });
  });
});

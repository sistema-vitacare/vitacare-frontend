import { afterEach, describe, expect, it } from 'vitest';
import {
  getAlert,
  getAlertSummary,
  listAlerts,
  resolveAlert,
} from '../../src/services/alertService.js';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import {
  DIRCE,
  READING,
  allAlerts,
  summaryOf,
} from '../support/fixtures/alerts.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('professional').id}`;
const ALERT = allAlerts()[0];

async function signIn() {
  await login(credentialsFor('professional'));
}

afterEach(() => {
  resetMockState();
});

describe('alertService', () => {
  it('lista pela API com os filtros da tela na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /alerts': () => apiPage([ALERT]) });

    const { data } = await listAlerts({
      status: 'open',
      sort: 'priority',
      patientId: undefined,
      page: 2,
      limit: 20,
    });

    expect(data).toEqual([ALERT]);
    expect(apiStub().last('GET /alerts')).toMatchObject({
      query: { status: 'open', sort: 'priority', page: '2', limit: '20' },
      token: TOKEN,
    });
  });

  it('pede o resumo dos abertos com o paciente do filtro', async () => {
    await signIn();
    apiStub().use({ 'GET /alerts/summary': () => summaryOf([ALERT]) });

    const { data } = await getAlertSummary({ patientId: DIRCE.id });

    expect(data.open).toEqual({ total: 1, critical: 1, warning: 0, info: 0 });
    expect(apiStub().last('GET /alerts/summary').query).toEqual({
      patientId: DIRCE.id,
    });
  });

  it('consulta e resolve pelas rotas do alerta', async () => {
    await signIn();
    apiStub().use({
      'GET /alerts/:alertId': () => ({ data: ALERT, meta: {} }),
      'POST /alerts/:alertId/resolve': () => ({
        data: { ...ALERT, status: 'resolved' },
        meta: {},
      }),
    });

    await getAlert(READING);
    const { data } = await resolveAlert(READING);

    expect(data.status).toBe('resolved');
    expect(
      ['GET /alerts/:alertId', 'POST /alerts/:alertId/resolve'].map(
        (route) => apiStub().last(route).params.alertId,
      ),
    ).toEqual([READING, READING]);
  });

  it('devolve o erro da API com o código, como o alerta já resolvido', async () => {
    await signIn();
    apiStub().use({
      'POST /alerts/:alertId/resolve': () =>
        apiFailure(409, 'ALERT_ALREADY_RESOLVED', 'O alerta já foi resolvido.'),
    });

    await expect(resolveAlert(READING)).rejects.toMatchObject({
      status: 409,
      code: 'ALERT_ALREADY_RESOLVED',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await getAlert('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe('/alerts/..%2Fusers');
  });
});

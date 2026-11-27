import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  exportAlertsReportPdf,
  exportCaregiversReportPdf,
  getAlertsReport,
  getCaregiversReport,
  listManagementReports,
  listRecentReports,
} from '../../src/services/managementReportService.js';
import { apiFailure, apiFile, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('admin').id}`;
const QUERY = { from: '2026-10-01', to: '2026-10-31', condition: 'DPOC' };

async function signIn() {
  await login(credentialsFor('admin'));
}

describe('managementReportService', () => {
  it('lê o catálogo e os recentes pela API, com o token da sessão', async () => {
    await signIn();
    const catalog = [{ type: 'alerts', exportCount: 12 }];
    const recent = [{ id: 'r1', type: 'alerts' }];
    apiStub().use({
      'GET /management-reports': () => ({ data: catalog, meta: {} }),
      'GET /management-reports/recent': () => apiPage(recent, { limit: 5 }),
    });

    const [types, latest] = [
      await listManagementReports(),
      await listRecentReports({ limit: 5 }),
    ];

    expect(types.data).toEqual(catalog);
    expect(latest.data).toEqual(recent);
    expect(apiStub().last('GET /management-reports').token).toBe(TOKEN);
    expect(apiStub().last('GET /management-reports/recent').query).toEqual({
      limit: '5',
    });
  });

  it('pede os relatórios de alertas e de cuidadores com o período e a condição', async () => {
    await signIn();
    apiStub().use({
      'GET /management-reports/alerts': () => ({
        data: { totals: { issued: 6 } },
        meta: {},
      }),
      'GET /management-reports/caregivers': () => ({
        data: { summary: { caregivers: 2 } },
        meta: {},
      }),
    });

    const alerts = await getAlertsReport(QUERY);
    const caregivers = await getCaregiversReport(QUERY);

    expect(alerts.data.totals.issued).toBe(6);
    expect(caregivers.data.summary.caregivers).toBe(2);
    expect(apiStub().last('GET /management-reports/alerts').query).toEqual(
      QUERY,
    );
    expect(apiStub().last('GET /management-reports/caregivers').query).toEqual(
      QUERY,
    );
  });

  it('baixa os PDFs com o nome que a API dá ao arquivo', async () => {
    await signIn();
    const pdf = (fileName) => () =>
      apiFile('%PDF-1.4', { fileName, type: 'application/pdf' });
    apiStub().use({
      'GET /management-reports/alerts/pdf': pdf(
        'relatorio-alertas-2026-10-01-a-2026-10-31.pdf',
      ),
      'GET /management-reports/caregivers/pdf': pdf(
        'relatorio-cuidadores-2026-10-01-a-2026-10-31.pdf',
      ),
    });

    const alerts = await exportAlertsReportPdf(QUERY);
    const caregivers = await exportCaregiversReportPdf(QUERY);

    expect([alerts.data.fileName, caregivers.data.fileName]).toEqual([
      'relatorio-alertas-2026-10-01-a-2026-10-31.pdf',
      'relatorio-cuidadores-2026-10-01-a-2026-10-31.pdf',
    ]);
    expect(apiStub().last('GET /management-reports/alerts/pdf').query).toEqual(
      QUERY,
    );
  });

  it('repassa o 403 do plano sem os relatórios gerenciais com o código da API', async () => {
    await signIn();
    const message =
      'Os relatórios gerenciais fazem parte do plano Enterprise. Solicite a mudança de plano para acessá-los.';
    apiStub().use({
      'GET /management-reports': () =>
        apiFailure(403, 'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE', message),
    });

    await expect(listManagementReports()).rejects.toMatchObject({
      status: 403,
      code: 'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE',
      message,
    });
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  exportPatientReportPdf,
  getPatientReport,
} from '../../src/services/reportService.js';
import { apiFailure, apiFile, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const PATIENT_ID = '3c9e2a71-5b1d-4e8f-9a2c-7d6e5f4a3b21';
const TOKEN = `token-${demoUser('professional').id}`;
const PERIOD = { from: '2026-10-01', to: '2026-10-31' };

async function signIn() {
  await login(credentialsFor('professional'));
}

afterEach(() => {
  resetMockState();
});

describe('reportService', () => {
  it('pede o relatório do paciente pela API, com o período e o token da sessão', async () => {
    await signIn();
    const report = { patient: { id: PATIENT_ID }, records: { total: 3 } };
    apiStub().use({
      'GET /patients/:patientId/report': () => ({ data: report, meta: {} }),
    });

    const { data } = await getPatientReport(PATIENT_ID, PERIOD);

    expect(data).toEqual(report);
    expect(apiStub().last('GET /patients/:patientId/report')).toMatchObject({
      params: { patientId: PATIENT_ID },
      query: PERIOD,
      token: TOKEN,
    });
  });

  it('escapa o id que vem do endereço da tela', async () => {
    await signIn();
    apiStub().use({
      'GET /patients/:patientId/report': () => ({ data: {}, meta: {} }),
    });

    await getPatientReport('../users/u1', PERIOD);

    expect(apiStub().last('GET /patients/:patientId/report').params).toEqual({
      patientId: '../users/u1',
    });
  });

  it('baixa o PDF com o nome que a API dá ao arquivo', async () => {
    await signIn();
    apiStub().use({
      'GET /patients/:patientId/report/pdf': () =>
        apiFile('%PDF-1.4', {
          fileName: 'relatorio-paciente-2026-10-01-a-2026-10-31.pdf',
          type: 'application/pdf',
        }),
    });

    const { data } = await exportPatientReportPdf(PATIENT_ID, PERIOD);

    expect(data.fileName).toBe(
      'relatorio-paciente-2026-10-01-a-2026-10-31.pdf',
    );
    expect(apiStub().last('GET /patients/:patientId/report/pdf').query).toEqual(
      PERIOD,
    );
  });

  it('repassa o limite de registros com o código e a mensagem da API', async () => {
    await signIn();
    const message =
      'O período tem registros demais para um relatório. Escolha um período menor.';
    apiStub().use({
      'GET /patients/:patientId/report': () =>
        apiFailure(422, 'REPORT_TOO_MANY_RECORDS', message),
    });

    await expect(getPatientReport(PATIENT_ID, PERIOD)).rejects.toMatchObject({
      status: 422,
      code: 'REPORT_TOO_MANY_RECORDS',
      message,
    });
  });
});

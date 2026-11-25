import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  createMedication,
  deactivateMedication,
  listMedications,
  reactivateMedication,
  updateMedication,
} from '../../src/services/medicationService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';
import {
  DIRCE,
  LOSARTANA,
  apiMedication,
} from '../support/fixtures/medications.js';

const TOKEN = `token-${demoUser('professional').id}`;
const MEDICATION = apiMedication(LOSARTANA, DIRCE, 'Losartana potássica 50 mg');

const answer = ({ body }) => ({ data: { ...MEDICATION, ...body }, meta: {} });

async function signIn() {
  await login(credentialsFor('professional'));
}

afterEach(() => {
  resetMockState();
});

describe('medicationService', () => {
  it('lista pela API com o paciente e o limite na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /medications': () => apiPage([MEDICATION]) });

    const { data } = await listMedications({ patientId: DIRCE, limit: 100 });

    expect(data).toEqual([MEDICATION]);
    expect(apiStub().last('GET /medications')).toMatchObject({
      query: { patientId: DIRCE, limit: '100' },
      token: TOKEN,
    });
  });

  it('cadastra e edita com o corpo que a tela monta', async () => {
    await signIn();
    apiStub().use({
      'POST /medications': answer,
      'PATCH /medications/:medicationId': answer,
    });
    const created = {
      patientId: DIRCE,
      name: 'Dipirona 500 mg',
      doseAmount: 0.5,
      doseUnit: 'tablet',
      times: ['13:00'],
    };

    await createMedication(created);
    await updateMedication(LOSARTANA, { name: 'Losartana potássica 100 mg' });

    expect(apiStub().last('POST /medications').body).toEqual(created);
    expect(apiStub().last('PATCH /medications/:medicationId')).toMatchObject({
      params: { medicationId: LOSARTANA },
      body: { name: 'Losartana potássica 100 mg' },
    });
  });

  it('inativa e reativa pelas rotas do medicamento', async () => {
    await signIn();
    apiStub().use({
      'POST /medications/:medicationId/deactivate': answer,
      'POST /medications/:medicationId/reactivate': answer,
    });

    await deactivateMedication(LOSARTANA);
    await reactivateMedication(LOSARTANA);

    expect(
      [
        'POST /medications/:medicationId/deactivate',
        'POST /medications/:medicationId/reactivate',
      ].map((route) => apiStub().last(route).params.medicationId),
    ).toEqual([LOSARTANA, LOSARTANA]);
  });

  it('devolve o erro da API com o código, como a edição sem mudança', async () => {
    await signIn();
    apiStub().use({
      'PATCH /medications/:medicationId': () =>
        apiFailure(
          422,
          'MEDICATION_NOTHING_TO_UPDATE',
          'Nenhuma alteração para salvar.',
        ),
    });

    await expect(updateMedication(LOSARTANA, {})).rejects.toMatchObject({
      status: 422,
      code: 'MEDICATION_NOTHING_TO_UPDATE',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await deactivateMedication('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe(
      '/medications/..%2Fusers/deactivate',
    );
  });
});

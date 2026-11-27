import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  createPatient,
  deactivatePatient,
  getPatient,
  getPatientEvolution,
  getPatientOverview,
  listPatients,
  reactivatePatient,
  updatePatient,
} from '../../src/services/patientService.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const PATIENT_ID = '0b639b83-76d0-570a-9017-7b6263d892cf';
const TOKEN = `token-${demoUser('professional').id}`;
const PATIENT = { id: PATIENT_ID, name: 'Paciente Exemplo', status: 'active' };

async function signIn() {
  await login(credentialsFor('professional'));
}

describe('patientService', () => {
  it('lista pela API com os filtros da tela na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /patients': () => apiPage([PATIENT]) });

    const { data, meta } = await listPatients({
      status: 'inactive',
      search: 'dirce',
      condition: undefined,
      page: 2,
      limit: 20,
    });

    expect(data).toEqual([PATIENT]);
    expect(meta.pagination.total).toBe(1);
    expect(apiStub().last('GET /patients')).toMatchObject({
      query: { status: 'inactive', search: 'dirce', page: '2', limit: '20' },
      token: TOKEN,
    });
  });

  it('entrega a meta.message da lista vazia, como a orientação a quem não tem vínculo', async () => {
    await signIn();
    const message =
      'Você ainda não tem paciente vinculado. Peça ao profissional responsável para liberar o seu acesso.';
    apiStub().use({ 'GET /patients': () => apiPage([], { message }) });

    const { data, meta } = await listPatients();

    expect(data).toEqual([]);
    expect(meta.message).toBe(message);
  });

  it('consulta, cadastra e edita pelas rotas do paciente', async () => {
    await signIn();
    apiStub().use({
      'GET /patients/:patientId': () => ({ data: PATIENT, meta: {} }),
      'POST /patients': ({ body }) => ({
        data: { id: PATIENT_ID, ...body },
        meta: {},
      }),
      'PATCH /patients/:patientId': ({ body }) => ({
        data: { ...PATIENT, ...body },
        meta: {},
      }),
    });

    await getPatient(PATIENT_ID);
    await createPatient({ name: 'Paciente Exemplo', birthDate: '1948-03-12' });
    const { data } = await updatePatient(PATIENT_ID, { phone: null });

    expect(apiStub().last('GET /patients/:patientId').params).toEqual({
      patientId: PATIENT_ID,
    });
    expect(apiStub().last('POST /patients').body).toEqual({
      name: 'Paciente Exemplo',
      birthDate: '1948-03-12',
    });
    expect(apiStub().last('PATCH /patients/:patientId')).toMatchObject({
      params: { patientId: PATIENT_ID },
      body: { phone: null },
    });
    expect(data.phone).toBeNull();
  });

  it('inativa e reativa sem corpo, pelas rotas de situação', async () => {
    await signIn();
    apiStub().use({
      'POST /patients/:patientId/deactivate': () => ({
        data: { ...PATIENT, status: 'inactive' },
        meta: {},
      }),
      'POST /patients/:patientId/reactivate': () => ({
        data: PATIENT,
        meta: {},
      }),
    });

    await deactivatePatient(PATIENT_ID);
    await reactivatePatient(PATIENT_ID);

    expect(
      apiStub().last('POST /patients/:patientId/deactivate'),
    ).toMatchObject({ params: { patientId: PATIENT_ID }, body: undefined });
    expect(
      apiStub().last('POST /patients/:patientId/reactivate'),
    ).toMatchObject({ params: { patientId: PATIENT_ID }, body: undefined });
  });

  it('lê a visão consolidada e a evolução com o período na query', async () => {
    await signIn();
    apiStub().use({
      'GET /patients/:patientId/overview': () => ({
        data: { patientId: PATIENT_ID, measurements: [] },
        meta: {
          message: 'Este paciente ainda não tem registro de acompanhamento.',
        },
      }),
      'GET /patients/:patientId/evolution': () => ({
        data: { patientId: PATIENT_ID, series: [] },
        meta: {},
      }),
    });

    const overview = await getPatientOverview(PATIENT_ID);
    await getPatientEvolution(PATIENT_ID, {
      from: '2026-11-01',
      to: undefined,
    });

    expect(overview.meta.message).toBe(
      'Este paciente ainda não tem registro de acompanhamento.',
    );
    expect(apiStub().last('GET /patients/:patientId/evolution').query).toEqual({
      from: '2026-11-01',
    });
  });

  it('devolve o erro da API com o código, como o CPF repetido', async () => {
    await signIn();
    apiStub().use({
      'POST /patients': () =>
        apiFailure(
          409,
          'PATIENT_DUPLICATE_CPF',
          'Já existe um paciente com este CPF na organização.',
          [{ field: 'cpf', code: 'DUPLICATE' }],
        ),
    });

    await expect(
      createPatient({ name: 'Paciente Exemplo' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PATIENT_DUPLICATE_CPF',
      fields: [{ field: 'cpf' }],
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await getPatient('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe('/patients/..%2Fusers');
  });
});

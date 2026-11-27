import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  annulFollowUp,
  createFollowUp,
  getFollowUp,
  listFollowUps,
} from '../../src/services/followUpService.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const PATIENT_ID = '0b639b83-76d0-570a-9017-7b6263d892cf';
const FOLLOW_UP_ID = 'f0110000-0000-5000-8000-000100000013';
const TOKEN = `token-${demoUser('caregiver').id}`;
const FOLLOW_UP = { id: FOLLOW_UP_ID, patientId: PATIENT_ID, status: 'valid' };
const BODY = {
  patientId: PATIENT_ID,
  formId: 'form-1',
  formVersionId: 'versao-1',
  visitedAt: '2026-11-24T10:00:00.000Z',
  notes: null,
  answers: [{ fieldId: 'campo-1', value: 120 }],
};

async function signIn() {
  await login(credentialsFor('caregiver'));
}

describe('followUpService', () => {
  it('lista os registros do paciente com os filtros da tela na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /follow-ups': () => apiPage([FOLLOW_UP]) });

    const { data } = await listFollowUps({
      patientId: PATIENT_ID,
      from: '2026-11-01',
      to: undefined,
      formId: 'form-1',
      authorUserId: '',
      page: 2,
      limit: 20,
    });

    expect(data).toEqual([FOLLOW_UP]);
    expect(apiStub().last('GET /follow-ups')).toMatchObject({
      query: {
        patientId: PATIENT_ID,
        from: '2026-11-01',
        formId: 'form-1',
        page: '2',
        limit: '20',
      },
      token: TOKEN,
    });
  });

  it('consulta, registra com o corpo da tela e anula com o motivo', async () => {
    await signIn();
    apiStub().use({
      'GET /follow-ups/:followUpId': () => ({ data: FOLLOW_UP, meta: {} }),
      'POST /follow-ups': ({ body }) => ({
        data: { id: FOLLOW_UP_ID, ...body },
        meta: {},
      }),
      'POST /follow-ups/:followUpId/annul': () => ({
        data: { ...FOLLOW_UP, status: 'annulled' },
        meta: {},
      }),
    });

    await getFollowUp(FOLLOW_UP_ID);
    await createFollowUp(BODY);
    const { data } = await annulFollowUp(FOLLOW_UP_ID, {
      reason: 'Valor digitado errado.',
    });

    expect(apiStub().last('GET /follow-ups/:followUpId').params).toEqual({
      followUpId: FOLLOW_UP_ID,
    });
    expect(apiStub().last('POST /follow-ups').body).toEqual(BODY);
    expect(apiStub().last('POST /follow-ups/:followUpId/annul')).toMatchObject({
      params: { followUpId: FOLLOW_UP_ID },
      body: { reason: 'Valor digitado errado.' },
    });
    expect(data.status).toBe('annulled');
  });

  it('devolve o erro da API com o código, como a versão do formulário desatualizada', async () => {
    await signIn();
    apiStub().use({
      'POST /follow-ups': () =>
        apiFailure(
          409,
          'FOLLOW_UP_FORM_VERSION_OUTDATED',
          'O formulário mudou. Recarregue antes de enviar.',
        ),
    });

    await expect(createFollowUp(BODY)).rejects.toMatchObject({
      status: 409,
      code: 'FOLLOW_UP_FORM_VERSION_OUTDATED',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await getFollowUp('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe('/follow-ups/..%2Fusers');
  });
});

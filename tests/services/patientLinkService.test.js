import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  createPatientLink,
  listEligibleUsers,
  listPatientLinks,
  revokePatientLink,
  updatePatientLink,
} from '../../src/services/patientLinkService.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor } from '../support/fixtures/sessions.js';

const PATIENT_ID = '0b639b83-76d0-570a-9017-7b6263d892cf';
const LINK_ID = '6a1f0c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';
const USER_ID = '8ac988c6-79bc-40a9-a175-4fce300121d2';

function link(role, name) {
  return { id: `${role}-${name}`, role, user: { id: name, name } };
}

describe('patientLinkService', () => {
  it('lista os vínculos do paciente com o responsável primeiro, depois cuidadores e familiares, por nome', async () => {
    await login(credentialsFor('professional'));
    // A API devolve do vínculo mais novo para o mais antigo.
    apiStub().use({
      'GET /patient-links': () =>
        apiPage([
          link('family', 'Zélia'),
          link('caregiver', 'Rui'),
          link('family', 'Ana'),
          link('caregiver', 'Bia'),
          link('responsible_professional', 'Rafael'),
        ]),
    });

    const { data, meta } = await listPatientLinks({
      patientId: PATIENT_ID,
      limit: 100,
    });

    expect(data.map((item) => item.user.name)).toEqual([
      'Rafael',
      'Bia',
      'Rui',
      'Ana',
      'Zélia',
    ]);
    expect(meta.pagination.total).toBe(5);
    expect(apiStub().last('GET /patient-links').query).toEqual({
      patientId: PATIENT_ID,
      limit: '100',
    });
  });

  it('lista os usuários elegíveis ao papel pedido', async () => {
    await login(credentialsFor('professional'));
    apiStub().use({
      'GET /patient-links/eligible-users': () =>
        apiPage([{ id: USER_ID, name: 'Cuidador Exemplo' }]),
    });

    const { data } = await listEligibleUsers({ role: 'caregiver', limit: 100 });

    expect(data).toHaveLength(1);
    expect(apiStub().last('GET /patient-links/eligible-users').query).toEqual({
      role: 'caregiver',
      limit: '100',
    });
  });

  it('cria, altera e revoga pelas rotas do vínculo', async () => {
    await login(credentialsFor('professional'));
    apiStub().use({
      'POST /patient-links': ({ body }) => ({
        data: { id: LINK_ID, ...body },
        meta: {},
      }),
      'PATCH /patient-links/:linkId': ({ body }) => ({
        data: { id: LINK_ID, ...body },
        meta: {},
      }),
      'POST /patient-links/:linkId/revoke': () => ({
        data: { id: LINK_ID, status: 'revoked' },
        meta: {},
      }),
    });

    await createPatientLink({
      patientId: PATIENT_ID,
      userId: USER_ID,
      linkType: 'Filha',
      note: null,
    });
    await updatePatientLink(LINK_ID, {
      linkType: null,
      note: 'Visita às terças',
    });
    const { data } = await revokePatientLink(LINK_ID);

    expect(apiStub().last('POST /patient-links').body).toEqual({
      patientId: PATIENT_ID,
      userId: USER_ID,
      linkType: 'Filha',
      note: null,
    });
    expect(apiStub().last('PATCH /patient-links/:linkId')).toMatchObject({
      params: { linkId: LINK_ID },
      body: { linkType: null, note: 'Visita às terças' },
    });
    expect(apiStub().last('POST /patient-links/:linkId/revoke').body).toBe(
      undefined,
    );
    expect(data.status).toBe('revoked');
  });

  it('devolve o erro da API com o código, como o vínculo repetido', async () => {
    await login(credentialsFor('professional'));
    apiStub().use({
      'POST /patient-links': () =>
        apiFailure(
          409,
          'PATIENT_LINK_ALREADY_EXISTS',
          'O usuário já tem vínculo vigente com o paciente.',
        ),
    });

    await expect(
      createPatientLink({ patientId: PATIENT_ID, userId: USER_ID }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PATIENT_LINK_ALREADY_EXISTS',
    });
  });
});

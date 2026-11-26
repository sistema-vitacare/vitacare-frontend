import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  createOrganization,
  deactivateOrganization,
  getOrganization,
  listOrganizations,
  reactivateOrganization,
  updateOrganization,
} from '../../src/services/platformOrganizationService.js';
import { apiFailure, apiPage, apiStub, reply } from '../support/apiStub.js';
import {
  BASIC,
  SOL_NASCENTE,
  VIVA_BEM,
} from '../support/fixtures/organizations.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('platform_admin').id}`;
const FORGED = '../users/u1';

async function signIn() {
  await login(credentialsFor('platform_admin'));
}

afterEach(() => {
  resetMockState();
});

describe('platformOrganizationService', () => {
  it('lista e consulta pela API, com os filtros na query, o id escapado e o token da sessão', async () => {
    await signIn();
    apiStub().use({
      'GET /organizations': () => apiPage([SOL_NASCENTE, VIVA_BEM]),
      'GET /organizations/:organizationId': ({ params }) => ({
        data: { ...SOL_NASCENTE, id: params.organizationId },
        meta: {},
      }),
    });

    const list = await listOrganizations({
      status: 'active',
      search: 'sol',
      page: 1,
      limit: 100,
    });
    const detail = await getOrganization(FORGED);

    expect(list.data).toEqual([SOL_NASCENTE, VIVA_BEM]);
    expect(apiStub().last('GET /organizations')).toMatchObject({
      query: { status: 'active', search: 'sol', page: '1', limit: '100' },
      token: TOKEN,
    });
    expect(detail.data.id).toBe(FORGED);
  });

  it('cadastra com o primeiro administrador e devolve a senha provisória como a API manda', async () => {
    await signIn();
    const body = {
      code: 'clinica-sol-nascente',
      tradeName: 'Clínica Sol Nascente',
      usagePlanId: BASIC.id,
      administrator: {
        name: 'Ana Exemplo',
        email: 'ana@example.test',
        cpf: '529.982.247-25',
      },
    };
    const created = {
      organization: SOL_NASCENTE,
      administrator: {
        id: '8f14e45f-ceea-4b7a-9f0b-1c2d3e4f5a6b',
        name: 'Ana Exemplo',
        email: 'ana@example.test',
      },
      temporaryPassword: 'X7hK2mPq9RtV4wYz8NcB',
    };
    apiStub().use({
      'POST /organizations': () => reply(201, { data: created, meta: {} }),
    });

    const { data } = await createOrganization(body);

    expect(data).toEqual(created);
    expect(apiStub().last('POST /organizations').body).toEqual(body);
  });

  it('edita, inativa e reativa pelas rotas da organização', async () => {
    await signIn();
    const answer = () => ({ data: SOL_NASCENTE, meta: {} });
    apiStub().use({
      'PATCH /organizations/:organizationId': answer,
      'POST /organizations/:organizationId/deactivate': answer,
      'POST /organizations/:organizationId/reactivate': answer,
    });

    await updateOrganization(SOL_NASCENTE.id, { email: null });
    await deactivateOrganization(SOL_NASCENTE.id);
    await reactivateOrganization(SOL_NASCENTE.id);

    expect(
      apiStub().last('PATCH /organizations/:organizationId'),
    ).toMatchObject({
      params: { organizationId: SOL_NASCENTE.id },
      body: { email: null },
    });
    for (const action of ['deactivate', 'reactivate']) {
      expect(
        apiStub().last(`POST /organizations/:organizationId/${action}`),
      ).toMatchObject({
        params: { organizationId: SOL_NASCENTE.id },
        body: undefined,
      });
    }
  });

  it('repassa o código repetido como o 409 da API, com o campo', async () => {
    await signIn();
    apiStub().use({
      'POST /organizations': () =>
        apiFailure(
          409,
          'ORGANIZATION_CODE_TAKEN',
          'Já existe uma organização com este código.',
          [{ field: 'code', code: 'DUPLICATE' }],
        ),
    });

    await expect(
      createOrganization({ code: 'clinica-sol-nascente' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_CODE_TAKEN',
      fields: [{ field: 'code', code: 'DUPLICATE' }],
    });
  });
});

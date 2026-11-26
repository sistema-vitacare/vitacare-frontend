import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  approveChangeRequest,
  assignOrganizationPlan,
  cancelChangeRequest,
  createChangeRequest,
  getOrganizationPlan,
  getOwnOrganization,
  getOwnPlan,
  listChangeRequests,
  listPlans,
  rejectChangeRequest,
  updateOwnOrganization,
} from '../../src/services/organizationService.js';
import { apiFailure, apiPage, apiStub, reply } from '../support/apiStub.js';
import {
  BASIC,
  ENTERPRISE,
  OWN_ORGANIZATION,
  PLANS,
  SOL_NASCENTE,
  apiChangeRequest,
  apiOrganizationPlan,
} from '../support/fixtures/organizations.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const ADMIN_TOKEN = `token-${demoUser('admin').id}`;
const MASTER_TOKEN = `token-${demoUser('platform_admin').id}`;
const FORGED = '../users/u1';
const REQUEST = apiChangeRequest();
const EXPIRY =
  'O plano vence em 16/11/2026 às 23:59 (horário de Brasília). Depois disso, novos cadastros e reativações de usuários e pacientes ficam bloqueados até a renovação. Solicite a renovação na área de plano.';

const answer = (data) => () => ({ data, meta: {} });

afterEach(() => {
  resetMockState();
});

describe('organização da sessão', () => {
  it('consulta e edita a própria organização pela rota da sessão, com o token', async () => {
    await login(credentialsFor('admin'));
    apiStub().use({
      'GET /organizations/me': answer(OWN_ORGANIZATION),
      'PATCH /organizations/me': answer(OWN_ORGANIZATION),
    });

    const { data } = await getOwnOrganization();
    await updateOwnOrganization({ phone: null, tradeName: 'Ipê Amarelo' });

    expect(data).toEqual(OWN_ORGANIZATION);
    expect(apiStub().last('GET /organizations/me').token).toBe(ADMIN_TOKEN);
    expect(apiStub().last('PATCH /organizations/me').body).toEqual({
      phone: null,
      tradeName: 'Ipê Amarelo',
    });
  });

  it('lê o plano com o aviso de vencimento na meta e o catálogo', async () => {
    await login(credentialsFor('admin'));
    const plan = apiOrganizationPlan({
      expiryWarning: 'within_7_days',
      endsAt: '2026-11-17T02:59:00.000Z',
      message: EXPIRY,
    });
    apiStub().use({
      'GET /organizations/me/plan': () => plan,
      'GET /plans': answer(PLANS),
    });

    const own = await getOwnPlan();
    const catalog = await listPlans();

    expect(own.data.term.expiryWarning).toBe('within_7_days');
    expect(own.meta.message).toBe(EXPIRY);
    expect(catalog.data).toEqual(PLANS);
  });

  it('pede e cancela a mudança de plano, com o id escapado', async () => {
    await login(credentialsFor('admin'));
    apiStub().use({
      'POST /plan-change-requests': () =>
        reply(201, { data: REQUEST, meta: {} }),
      'POST /plan-change-requests/:requestId/cancel': ({ params }) => ({
        data: { ...REQUEST, id: params.requestId, status: 'cancelled' },
        meta: {},
      }),
    });

    await createChangeRequest({ requestedPlanId: ENTERPRISE.id, notes: null });
    const cancelled = await cancelChangeRequest(FORGED);

    expect(apiStub().last('POST /plan-change-requests').body).toEqual({
      requestedPlanId: ENTERPRISE.id,
      notes: null,
    });
    expect(cancelled.data.id).toBe(FORGED);
  });

  it('repassa a solicitação já decidida como o 409 da API', async () => {
    await login(credentialsFor('admin'));
    apiStub().use({
      'POST /plan-change-requests/:requestId/cancel': () =>
        apiFailure(
          409,
          'PLAN_CHANGE_REQUEST_NOT_PENDING',
          'A solicitação já foi decidida ou cancelada.',
        ),
    });

    await expect(cancelChangeRequest(REQUEST.id)).rejects.toMatchObject({
      status: 409,
      code: 'PLAN_CHANGE_REQUEST_NOT_PENDING',
    });
  });
});

describe('plano das organizações, pela plataforma', () => {
  it('consulta e atribui o plano de uma organização pelas rotas dela', async () => {
    await login(credentialsFor('platform_admin'));
    const body = { planId: ENTERPRISE.id, userLimit: 60, reason: 'Contrato' };
    apiStub().use({
      'GET /organizations/:organizationId/plan': ({ params }) =>
        apiOrganizationPlan({ organizationId: params.organizationId }),
      'PUT /organizations/:organizationId/plan': ({ params }) =>
        apiOrganizationPlan({
          organizationId: params.organizationId,
          plan: ENTERPRISE,
          userLimit: 60,
        }),
    });

    const current = await getOrganizationPlan(FORGED);
    await assignOrganizationPlan(SOL_NASCENTE.id, body);

    expect(current.data.organizationId).toBe(FORGED);
    expect(
      apiStub().last('GET /organizations/:organizationId/plan').token,
    ).toBe(MASTER_TOKEN);
    expect(
      apiStub().last('PUT /organizations/:organizationId/plan'),
    ).toMatchObject({ params: { organizationId: SOL_NASCENTE.id }, body });
  });

  it('lista as solicitações com os filtros na query e as decide pelas rotas delas', async () => {
    await login(credentialsFor('platform_admin'));
    apiStub().use({
      'GET /plan-change-requests': () => apiPage([REQUEST]),
      'POST /plan-change-requests/:requestId/approve': answer({
        ...REQUEST,
        status: 'approved',
      }),
      'POST /plan-change-requests/:requestId/reject': answer({
        ...REQUEST,
        status: 'rejected',
      }),
    });

    const { data } = await listChangeRequests({
      status: 'pending',
      limit: 100,
    });
    await approveChangeRequest(REQUEST.id, { endsAt: null });
    await rejectChangeRequest(REQUEST.id, { decisionNote: 'Sem contrato.' });

    expect(data).toEqual([REQUEST]);
    expect(apiStub().last('GET /plan-change-requests').query).toEqual({
      status: 'pending',
      limit: '100',
    });
    expect(
      apiStub().last('POST /plan-change-requests/:requestId/approve'),
    ).toMatchObject({
      params: { requestId: REQUEST.id },
      body: { endsAt: null },
    });
    expect(
      apiStub().last('POST /plan-change-requests/:requestId/reject').body,
    ).toEqual({ decisionNote: 'Sem contrato.' });
  });

  it('repassa a regra do termo recusada pela API, com o campo', async () => {
    await login(credentialsFor('platform_admin'));
    apiStub().use({
      'PUT /organizations/:organizationId/plan': () =>
        apiFailure(
          422,
          'PLAN_LIMIT_NOT_EXPANDABLE',
          'Este plano tem limites fixos. Só o plano Enterprise admite expansão conforme contratação.',
          [{ field: 'userLimit', code: 'NOT_EXPANDABLE' }],
        ),
    });

    await expect(
      assignOrganizationPlan(SOL_NASCENTE.id, {
        planId: BASIC.id,
        userLimit: 12,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_LIMIT_NOT_EXPANDABLE',
      fields: [{ field: 'userLimit', code: 'NOT_EXPANDABLE' }],
    });
  });
});

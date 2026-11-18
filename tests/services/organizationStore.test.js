// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BEM_VIVER_ID } from '../../src/data/mocks/organizations.js';
import { platformOrganization } from '../../src/data/mocks/platform.js';
import {
  BASIC_PLAN,
  ENTERPRISE_PLAN,
  organizationTerm,
} from '../../src/data/mocks/plans.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  addChangeRequest,
  addOrganization,
  allChangeRequests,
  allClientOrganizations,
  allPlans,
  changeChangeRequest,
  changeOrganization,
  changeTerm,
  currentPlan,
  currentTerm,
  findOrganization,
  findPlan,
  replaceTerm,
  seededUsage,
} from '../../src/services/organizationStore.js';

const created = {
  id: 'f0000000-0000-5000-8000-000000000001',
  code: 'clinica-nova',
  tradeName: 'Clínica Nova',
  status: 'active',
  usagePlanId: BASIC_PLAN.id,
};
const createdTerm = {
  id: 'f0000000-0000-5000-8000-000000000002',
  organizationId: created.id,
  planId: BASIC_PLAN.id,
  startsAt: '2026-11-16T15:00:00.000Z',
  endsAt: null,
  origin: 'initial',
  userLimit: null,
  patientLimit: null,
};
// Só as solicitações feitas na sessão; a pendente simulada da Bem Viver
// fica de fora destes testes.
const sessionRequests = () =>
  allChangeRequests().filter((item) => item.organizationId === organization.id);

const request = {
  id: 'c4a9e000-0000-5000-8000-000000000001',
  organizationId: organization.id,
  status: 'pending',
};

describe('estado das organizações e dos planos', () => {
  afterEach(() => resetMockState());

  it('encontra a organização cliente e a de plataforma pelo id', () => {
    expect(findOrganization(organization.id)).toEqual(organization);
    expect(findOrganization(platformOrganization.id)).toEqual(
      platformOrganization,
    );
  });

  it('devolve nulo para organização ou plano que não existe', () => {
    expect(findOrganization('inexistente')).toBeNull();
    expect(findPlan('inexistente')).toBeNull();
  });

  it('lista só as organizações clientes', () => {
    const ids = allClientOrganizations().map((item) => item.id);

    expect(ids).toContain(organization.id);
    expect(ids).toContain(BEM_VIVER_ID);
    expect(ids).not.toContain(platformOrganization.id);
  });

  it('aplica a edição dos dados à organização', () => {
    changeOrganization(organization.id, { phone: null });

    expect(findOrganization(organization.id).phone).toBeNull();
    expect(allClientOrganizations()[0].phone).toBeNull();
  });

  it('guarda o catálogo e acha o plano pelo id', () => {
    expect(allPlans()).toEqual([BASIC_PLAN, ENTERPRISE_PLAN]);
    expect(findPlan(BASIC_PLAN.id)).toEqual(BASIC_PLAN);
  });

  it('troca o termo de vigência da organização', () => {
    expect(currentTerm(organization.id)).toEqual(organizationTerm);

    changeTerm(organization.id, { endsAt: '2026-11-17T02:59:00.000Z' });

    expect(currentTerm(organization.id).endsAt).toBe(
      '2026-11-17T02:59:00.000Z',
    );
  });

  it('lê o plano corrente pelo termo de vigência', () => {
    expect(currentPlan(organization.id)).toEqual(ENTERPRISE_PLAN);

    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    expect(currentPlan(organization.id)).toEqual(BASIC_PLAN);
    expect(currentPlan(platformOrganization.id)).toBeNull();
  });

  it('guarda a solicitação de mudança e a decisão dela', () => {
    addChangeRequest(request);
    changeChangeRequest(request.id, { status: 'cancelled' });

    expect(sessionRequests()).toEqual([{ ...request, status: 'cancelled' }]);
  });

  it('traz a solicitação pendente simulada e guarda a decisão dela', () => {
    const [seeded] = allChangeRequests().filter(
      (item) => item.organizationId === BEM_VIVER_ID,
    );
    expect(seeded.status).toBe('pending');

    changeChangeRequest(seeded.id, { status: 'rejected' });

    expect(
      allChangeRequests().find((item) => item.id === seeded.id).status,
    ).toBe('rejected');
  });

  it('cadastra a organização com o termo inicial, o uso de partida e a busca pelo id', () => {
    addOrganization(created, createdTerm);

    expect(allClientOrganizations().map((item) => item.id)).toContain(
      created.id,
    );
    expect(findOrganization(created.id)).toEqual(created);
    expect(currentTerm(created.id)).toEqual(createdTerm);
    expect(seededUsage(created.id)).toEqual({ users: 1, patients: 0 });
  });

  it('substitui o termo inteiro na atribuição, sem herdar limite do anterior', () => {
    replaceTerm(organization.id, {
      ...createdTerm,
      organizationId: organization.id,
      planId: ENTERPRISE_PLAN.id,
      origin: 'assignment',
      userLimit: 60,
    });
    replaceTerm(organization.id, {
      ...createdTerm,
      organizationId: organization.id,
      planId: ENTERPRISE_PLAN.id,
      origin: 'assignment',
    });

    expect(currentTerm(organization.id).userLimit).toBeNull();
    expect(currentTerm(organization.id).origin).toBe('assignment');
  });

  it('dá uso fixo às organizações sem dados simulados e nenhum à de demonstração', () => {
    expect(seededUsage(BEM_VIVER_ID)).toEqual(
      expect.objectContaining({ users: expect.any(Number) }),
    );
    expect(seededUsage(organization.id)).toBeNull();
  });

  it('volta ao início com resetMockState', () => {
    changeOrganization(organization.id, { phone: null });
    changeTerm(organization.id, { endsAt: '2026-11-17T02:59:00.000Z' });
    addChangeRequest(request);
    addOrganization(created, createdTerm);
    resetMockState();

    expect(findOrganization(organization.id)).toEqual(organization);
    expect(currentTerm(organization.id)).toEqual(organizationTerm);
    expect(sessionRequests()).toEqual([]);
    expect(findOrganization(created.id)).toBeNull();
  });
});

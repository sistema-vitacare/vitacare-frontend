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
} from '../../src/services/organizationStore.js';

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

    expect(allChangeRequests()).toEqual([{ ...request, status: 'cancelled' }]);
  });

  it('volta ao início com resetMockState', () => {
    changeOrganization(organization.id, { phone: null });
    changeTerm(organization.id, { endsAt: '2026-11-17T02:59:00.000Z' });
    addChangeRequest(request);
    resetMockState();

    expect(findOrganization(organization.id)).toEqual(organization);
    expect(currentTerm(organization.id)).toEqual(organizationTerm);
    expect(allChangeRequests()).toEqual([]);
  });
});

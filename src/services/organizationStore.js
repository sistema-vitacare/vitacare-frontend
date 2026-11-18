// Estado simulado das organizações e dos planos: organizações cadastradas e
// editadas, termo de vigência e solicitações de mudança de plano, como a API
// guardaria no banco.
import {
  changeRequestsAsOf,
  clientOrganizations,
  clientTermsAsOf,
  simulatedUsage,
} from '../data/mocks/organizations.js';
import { platformOrganization } from '../data/mocks/platform.js';
import { plans } from '../data/mocks/plans.js';
import { registerMockState } from './mockApi.js';

// A organização cadastrada na sessão nasce com o primeiro administrador e
// sem pacientes.
const NEW_ORGANIZATION_USAGE = Object.freeze({ users: 1, patients: 0 });

let createdOrganizations = [];
let createdUsage = new Map();
let organizationChanges = new Map();
let termChanges = new Map();
let createdRequests = [];
let requestChanges = new Map();

registerMockState(() => {
  createdOrganizations = [];
  createdUsage = new Map();
  organizationChanges = new Map();
  termChanges = new Map();
  createdRequests = [];
  requestChanges = new Map();
});

function withChanges(item) {
  return { ...item, ...organizationChanges.get(item.id) };
}

export function allClientOrganizations() {
  return [...clientOrganizations, ...createdOrganizations].map(withChanges);
}

export function findOrganization(organizationId) {
  return (
    [...clientOrganizations, ...createdOrganizations, platformOrganization]
      .filter((item) => item.id === organizationId)
      .map(withChanges)[0] ?? null
  );
}

/** Organização cadastrada pela plataforma, com o termo inicial dela. */
export function addOrganization(organization, term) {
  createdOrganizations = [...createdOrganizations, organization];
  createdUsage.set(organization.id, NEW_ORGANIZATION_USAGE);
  termChanges.set(organization.id, term);
}

export function changeOrganization(organizationId, changes) {
  organizationChanges.set(organizationId, {
    ...organizationChanges.get(organizationId),
    ...changes,
  });
}

/**
 * Uso das organizações sem usuários nem pacientes simulados; `null` para a
 * de demonstração, cujo uso sai dos estados.
 */
export function seededUsage(organizationId) {
  return (
    createdUsage.get(organizationId) ?? simulatedUsage[organizationId] ?? null
  );
}

export function allPlans() {
  return plans;
}

export function findPlan(planId) {
  return plans.find((plan) => plan.id === planId) ?? null;
}

/** Termo corrente da organização; `null` sem termo (a plataforma não tem). */
export function currentTerm(organizationId, now = new Date()) {
  const seed = clientTermsAsOf(now).find(
    (term) => term.organizationId === organizationId,
  );
  const changes = termChanges.get(organizationId);
  if (!seed && !changes) {
    return null;
  }
  return { ...seed, ...changes };
}

/** Plano corrente: o do termo de vigência, como a API. */
export function currentPlan(organizationId) {
  const term = currentTerm(organizationId);
  return term ? findPlan(term.planId) : null;
}

export function changeTerm(organizationId, changes) {
  termChanges.set(organizationId, {
    ...termChanges.get(organizationId),
    ...changes,
  });
}

/**
 * Termo novo da atribuição ou da aprovação, que encerra o anterior: o termo
 * inteiro é trocado, e nada do anterior (como um limite expandido) passa
 * para ele.
 */
export function replaceTerm(organizationId, term) {
  termChanges.set(organizationId, term);
}

export function allChangeRequests(now = new Date()) {
  return [...changeRequestsAsOf(now), ...createdRequests].map((request) => ({
    ...request,
    ...requestChanges.get(request.id),
  }));
}

export function addChangeRequest(request) {
  createdRequests = [...createdRequests, request];
}

export function changeChangeRequest(requestId, changes) {
  requestChanges.set(requestId, {
    ...requestChanges.get(requestId),
    ...changes,
  });
}

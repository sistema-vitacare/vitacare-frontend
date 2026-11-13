// Estado simulado das organizações e dos planos: dados cadastrais, termo de
// vigência e solicitações de mudança de plano, como a API guardaria no banco.
import { clientOrganizations } from '../data/mocks/organizations.js';
import { platformOrganization } from '../data/mocks/platform.js';
import { organizationTerm, plans } from '../data/mocks/plans.js';
import { registerMockState } from './mockApi.js';

const seedTerms = new Map([
  [organizationTerm.organizationId, organizationTerm],
]);

let organizationChanges = new Map();
let termChanges = new Map();
let changeRequests = [];

registerMockState(() => {
  organizationChanges = new Map();
  termChanges = new Map();
  changeRequests = [];
});

function withChanges(item) {
  return { ...item, ...organizationChanges.get(item.id) };
}

export function allClientOrganizations() {
  return clientOrganizations.map(withChanges);
}

export function findOrganization(organizationId) {
  return (
    [...clientOrganizations, platformOrganization]
      .filter((item) => item.id === organizationId)
      .map(withChanges)[0] ?? null
  );
}

export function changeOrganization(organizationId, changes) {
  organizationChanges.set(organizationId, {
    ...organizationChanges.get(organizationId),
    ...changes,
  });
}

export function allPlans() {
  return plans;
}

export function findPlan(planId) {
  return plans.find((plan) => plan.id === planId) ?? null;
}

/** Termo corrente da organização; `null` sem termo (a plataforma não tem). */
export function currentTerm(organizationId) {
  const seed = seedTerms.get(organizationId);
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

export function allChangeRequests() {
  return changeRequests;
}

export function addChangeRequest(request) {
  changeRequests = [...changeRequests, request];
}

export function changeChangeRequest(requestId, changes) {
  changeRequests = changeRequests.map((request) =>
    request.id === requestId ? { ...request, ...changes } : request,
  );
}

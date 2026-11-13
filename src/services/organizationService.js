// Organização da sessão, plano e solicitações de mudança simulados, no
// formato das rotas `organizations/me`, `organizations/me/plan`, `plans` e
// `plan-change-requests` (manual, conferido em 12/11/2026; mensagens de erro
// conferidas em 13/11/2026). Na integração, cada função passa a chamar a
// rota.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { organizationErrors } from '../utils/organizationFields.js';
import { planExpiryMessage, planExpiryWarning } from '../utils/planExpiry.js';
import { currentViewer } from './authService.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import {
  addChangeRequest,
  allChangeRequests,
  allClientOrganizations,
  allPlans,
  changeChangeRequest,
  changeOrganization,
  currentPlan,
  currentTerm,
  findOrganization,
  findPlan,
} from './organizationStore.js';
import { allPatients, nextId } from './patientStore.js';
import { allUsers } from './userStore.js';

const NOTES_MAX = 500;

const error = (status, code, message, fields = null) =>
  new ApiError({ status, code, message, fields });

function viewerFor(permission) {
  const viewer = currentViewer();
  requirePermission(viewer, permission);
  return viewer;
}

/** Uma das permissões basta, como nas rotas de catálogo e de solicitações. */
function viewerWithAny(permissions) {
  const viewer = currentViewer();
  const allowed = permissions.find((permission) =>
    viewer?.permissions.includes(permission),
  );
  requirePermission(viewer, allowed ?? permissions[0]);
  return viewer;
}

// O administrador de organização cliente não recebe o tipo; a plataforma sim.
function organizationView(organization, viewer) {
  if (viewer.organization.kind === 'platform') {
    return organization;
  }
  const view = { ...organization };
  delete view.kind;
  return view;
}

export function getOwnOrganization() {
  return mockRequest(() => {
    const viewer = viewerFor(P.ORGANIZATION_READ);
    return respond(
      organizationView(findOrganization(viewer.organization.id), viewer),
    );
  });
}

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);
const documentKey = (value) =>
  (value ?? '').replace(/[^0-9A-Za-z]/g, '').toLowerCase();

export function updateOwnOrganization(body = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.ORGANIZATION_UPDATE);
    const errors = organizationErrors(body);
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const changes = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== undefined)
        .map(([field, value]) => [field, trimmed(value)]),
    );
    if (Object.keys(changes).length === 0) {
      throw error(
        422,
        'ORGANIZATION_NOTHING_TO_UPDATE',
        'Informe ao menos um campo para atualizar.',
      );
    }
    // O documento vale uma vez entre todas as organizações, sem pontuação e
    // sem caixa, inclusive entre as inativas.
    if (changes.document) {
      const taken = allClientOrganizations().some(
        (item) =>
          item.id !== viewer.organization.id &&
          documentKey(item.document) === documentKey(changes.document),
      );
      if (taken) {
        throw error(
          409,
          'ORGANIZATION_DOCUMENT_TAKEN',
          'Já existe uma organização com este documento.',
          [{ field: 'document', code: 'DUPLICATE' }],
        );
      }
    }
    changeOrganization(viewer.organization.id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    return respond(
      organizationView(findOrganization(viewer.organization.id), viewer),
    );
  });
}

const planSummary = (plan) => ({
  id: plan.id,
  code: plan.code,
  name: plan.name,
});

// A organização cliente não vê quem decidiu; só a plataforma vê.
function requestView(request, viewer) {
  return viewer.organization.kind === 'platform'
    ? request
    : { ...request, decidedByUserId: null };
}

function pendingRequest(organizationId) {
  return (
    allChangeRequests().find(
      (request) =>
        request.organizationId === organizationId &&
        request.status === 'pending',
    ) ?? null
  );
}

function termView(term, now) {
  const expiryWarning = planExpiryWarning(term.endsAt, now);
  return {
    id: term.id,
    startsAt: term.startsAt,
    endsAt: term.endsAt,
    status: expiryWarning === 'expired' ? 'expired' : 'active',
    expiryWarning,
    origin: term.origin,
    userLimit: term.userLimit,
    patientLimit: term.patientLimit,
  };
}

export function getOwnPlan() {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLAN_READ);
    const organizationId = viewer.organization.id;
    const now = new Date();
    const plan = currentPlan(organizationId);
    const term = termView(currentTerm(organizationId), now);
    const pending = pendingRequest(organizationId);
    const message = planExpiryMessage(term.expiryWarning, term.endsAt);
    return respond(
      {
        organizationId,
        plan,
        term,
        // Limite efetivo: o expandido do termo, senão o do catálogo.
        limits: {
          users: term.userLimit ?? plan.userLimit,
          patients: term.patientLimit ?? plan.patientLimit,
        },
        // A mesma conta que decide o limite no cadastro e na reativação.
        usage: {
          users: allUsers().filter((user) =>
            ['pending', 'active'].includes(user.status),
          ).length,
          patients: allPatients().filter(
            (patient) => patient.status === 'active',
          ).length,
        },
        pendingChangeRequest: pending ? requestView(pending, viewer) : null,
      },
      message ? { message } : {},
    );
  });
}

export function listPlans() {
  return mockRequest(() => {
    viewerWithAny([P.PLAN_READ, P.PLATFORM_ORGANIZATIONS_READ]);
    return respond(allPlans());
  });
}

export function listChangeRequests({
  status,
  organizationId,
  page,
  limit,
} = {}) {
  return mockRequest(() => {
    const viewer = viewerWithAny([P.PLAN_READ, P.PLATFORM_ORGANIZATIONS_READ]);
    const platform = viewer.organization.kind === 'platform';
    const scope = platform ? organizationId : viewer.organization.id;
    const items = allChangeRequests()
      .filter((request) => !scope || request.organizationId === scope)
      .filter((request) => !status || request.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((request) => requestView(request, viewer));
    return paginate(items, { page, limit });
  });
}

export function createChangeRequest({ requestedPlanId, notes = null } = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLAN_CHANGE_REQUESTS_CREATE);
    const text = trimmed(notes);
    if (text !== null && (text.length === 0 || text.length > NOTES_MAX)) {
      throw validationError([
        {
          field: 'notes',
          code: text.length === 0 ? 'MIN_LENGTH' : 'MAX_LENGTH',
        },
      ]);
    }
    const organizationId = viewer.organization.id;
    if (pendingRequest(organizationId)) {
      throw error(
        409,
        'PLAN_CHANGE_REQUEST_ALREADY_PENDING',
        'Já existe uma solicitação de mudança de plano em análise. Aguarde a decisão ou cancele-a.',
      );
    }
    const requested = findPlan(requestedPlanId);
    if (!requested) {
      throw error(
        422,
        'PLAN_NOT_FOUND',
        'Plano de uso inexistente ou indisponível.',
        [{ field: 'requestedPlanId', code: 'NOT_FOUND' }],
      );
    }
    const current = currentPlan(organizationId);
    const now = new Date();
    const expired =
      termView(currentTerm(organizationId), now).status === 'expired';
    // O mesmo plano só vale como pedido de renovação, com a vigência vencida.
    if (requested.id === current.id && !expired) {
      throw error(
        422,
        'PLAN_CHANGE_SAME_PLAN',
        'O plano solicitado é o plano atual. Só é possível pedir o mesmo plano para renovar uma vigência vencida.',
        [{ field: 'requestedPlanId', code: 'SAME_PLAN' }],
      );
    }
    const request = {
      id: nextId('c4a9e000'),
      organizationId,
      currentPlan: planSummary(current),
      requestedPlan: planSummary(requested),
      notes: text,
      status: 'pending',
      requestedByUserId: viewer.user.id,
      decidedByUserId: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: now.toISOString(),
    };
    addChangeRequest(request);
    return respond(requestView(request, viewer));
  });
}

export function cancelChangeRequest(requestId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLAN_CHANGE_REQUESTS_CREATE);
    const request = allChangeRequests().find(
      (item) =>
        item.id === requestId && item.organizationId === viewer.organization.id,
    );
    if (!request) {
      throw error(
        404,
        'PLAN_CHANGE_REQUEST_NOT_FOUND',
        'Solicitação de mudança de plano não encontrada.',
      );
    }
    if (request.status !== 'pending') {
      throw error(
        409,
        'PLAN_CHANGE_REQUEST_NOT_PENDING',
        'A solicitação já foi decidida ou cancelada.',
      );
    }
    changeChangeRequest(requestId, {
      status: 'cancelled',
      decidedByUserId: viewer.user.id,
      decidedAt: new Date().toISOString(),
    });
    return respond(
      requestView(
        allChangeRequests().find((item) => item.id === requestId),
        viewer,
      ),
    );
  });
}

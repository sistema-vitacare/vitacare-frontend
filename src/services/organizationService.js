// Organização da sessão, plano e solicitações de mudança simulados, no
// formato das rotas `organizations/me`, `organizations/me/plan`, `plans` e
// `plan-change-requests` (manual, conferido em 12/11/2026; mensagens de erro
// conferidas em 13/11/2026), e o plano das organizações clientes pela
// plataforma, com atribuição e decisão das solicitações (conferidos em
// 16/11/2026, commit `e1cf219`). Na integração, cada função passa a chamar a
// rota.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { organizationErrors } from '../utils/organizationFields.js';
import { planExpiryMessage, planExpiryWarning } from '../utils/planExpiry.js';
import {
  decisionNoteError,
  planTermFieldErrors,
  planTermRuleError,
} from '../utils/planTerm.js';
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
  replaceTerm,
  seededUsage,
} from './organizationStore.js';
import { allPatients, nextId } from './patientStore.js';
import { allUsers } from './userStore.js';

const NOTES_MAX = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const organizationNotFound = () =>
  error(404, 'ORGANIZATION_NOT_FOUND', 'Organização não encontrada.');

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

/**
 * Recusa o documento de outra organização: ele vale uma vez entre todas,
 * sem pontuação e sem caixa, inclusive entre as inativas.
 */
export function assertDocumentAvailable(document, organizationId = null) {
  const taken =
    document &&
    allClientOrganizations().some(
      (item) =>
        item.id !== organizationId &&
        documentKey(item.document) === documentKey(document),
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

/**
 * Edição pelo corpo de PATCH, o mesmo caso de uso na API para
 * `organizations/me` e para `organizations/{id}` da plataforma: campos, corpo
 * vazio, organização alcançada e documento único, nessa ordem.
 */
export function saveOrganization(viewer, organizationId, body = {}) {
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
  if (!findOrganization(organizationId)) {
    throw organizationNotFound();
  }
  assertDocumentAvailable(changes.document, organizationId);
  changeOrganization(organizationId, {
    ...changes,
    updatedAt: new Date().toISOString(),
  });
  return organizationView(findOrganization(organizationId), viewer);
}

export function updateOwnOrganization(body = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.ORGANIZATION_UPDATE);
    return respond(saveOrganization(viewer, viewer.organization.id, body));
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

// Usuários e pacientes simulados são só da organização de demonstração,
// contada pelos estados com a mesma conta que decide o limite no cadastro e
// na reativação; as outras têm uso fixo nos dados simulados.
function usageOf(organizationId) {
  return (
    seededUsage(organizationId) ?? {
      users: allUsers().filter((user) =>
        ['pending', 'active'].includes(user.status),
      ).length,
      patients: allPatients().filter((patient) => patient.status === 'active')
        .length,
    }
  );
}

/**
 * Plano da organização como `organizations/me/plan` e
 * `organizations/{id}/plan` o devolvem, com o aviso de vencimento, quando
 * houver, em `message`.
 */
function planView(organizationId, viewer) {
  const now = new Date();
  const plan = currentPlan(organizationId);
  const term = termView(currentTerm(organizationId), now);
  const pending = pendingRequest(organizationId);
  return {
    data: {
      organizationId,
      plan,
      term,
      // Limite efetivo: o expandido do termo, senão o do catálogo.
      limits: {
        users: term.userLimit ?? plan.userLimit,
        patients: term.patientLimit ?? plan.patientLimit,
      },
      usage: usageOf(organizationId),
      pendingChangeRequest: pending ? requestView(pending, viewer) : null,
    },
    message: planExpiryMessage(term.expiryWarning, term.endsAt),
  };
}

export function getOwnPlan() {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLAN_READ);
    const { data, message } = planView(viewer.organization.id, viewer);
    return respond(data, message ? { message } : {});
  });
}

// Só organização cliente tem plano; a de plataforma fica fora, como na API.
function assertClientOrganization(organizationId) {
  if (!currentTerm(organizationId)) {
    throw organizationNotFound();
  }
}

export function getOrganizationPlan(organizationId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLATFORM_ORGANIZATIONS_READ);
    assertClientOrganization(organizationId);
    const { data, message } = planView(organizationId, viewer);
    return respond(data, message ? { message } : {});
  });
}

const RULE_ERRORS = {
  IN_PAST: [
    'PLAN_TERM_END_IN_PAST',
    'A data de fim da vigência deve ser futura.',
  ],
  NOT_EXPANDABLE: [
    'PLAN_LIMIT_NOT_EXPANDABLE',
    'Este plano tem limites fixos. Só o plano Enterprise admite expansão conforme contratação.',
  ],
  BELOW_CATALOG: [
    'PLAN_LIMIT_BELOW_CATALOG',
    'A expansão não pode ficar abaixo do limite do plano. Omita o campo para usar o limite do catálogo.',
  ],
};

function assertTermRule(body, plan, now) {
  const rule = planTermRuleError(body, { plan, now });
  if (rule) {
    const [code, message] = RULE_ERRORS[rule.code];
    throw error(422, code, message, [rule]);
  }
}

// A data de fim é conferida antes da organização e do plano, como no caso de
// uso da API; sem limites no corpo, a regra não lê o plano.
function assertEndInFuture(body, now) {
  assertTermRule({ endsAt: body.endsAt }, null, now);
}

/**
 * Termo novo da atribuição ou da aprovação: substitui o anterior inteiro, e
 * a organização passa a apontar para o plano dele.
 */
function openTerm(organizationId, plan, body, origin, now) {
  replaceTerm(organizationId, {
    id: nextId('6f1d0c2e'),
    organizationId,
    planId: plan.id,
    startsAt: now.toISOString(),
    endsAt: body.endsAt ? new Date(body.endsAt).toISOString() : null,
    origin,
    userLimit: body.userLimit ?? null,
    patientLimit: body.patientLimit ?? null,
  });
  if (findOrganization(organizationId).usagePlanId !== plan.id) {
    changeOrganization(organizationId, {
      usagePlanId: plan.id,
      updatedAt: now.toISOString(),
    });
  }
}

/**
 * Atribuição, troca, renovação ou expansão pela plataforma, com o corpo de
 * PUT /organizations/{id}/plan. Não decide a solicitação pendente.
 */
export function assignOrganizationPlan(organizationId, body = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLATFORM_ORGANIZATIONS_UPDATE);
    const errors = [
      ...(typeof body.planId === 'string' && UUID_PATTERN.test(body.planId)
        ? []
        : [{ field: 'planId', code: 'IS_UUID' }]),
      ...planTermFieldErrors(body, { noteField: 'reason' }),
    ];
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const now = new Date();
    assertEndInFuture(body, now);
    assertClientOrganization(organizationId);
    const plan = findPlan(body.planId);
    if (!plan) {
      throw error(
        422,
        'PLAN_NOT_FOUND',
        'Plano de uso inexistente ou indisponível.',
        [{ field: 'planId', code: 'NOT_FOUND' }],
      );
    }
    assertTermRule(body, plan, now);
    openTerm(organizationId, plan, body, 'assignment', now);
    return respond(planView(organizationId, viewer).data);
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

/**
 * Solicitação pendente que a sessão alcança: a da própria organização, ou
 * qualquer uma para a plataforma (`organizationId` nulo).
 */
function pendingRequestById(requestId, organizationId) {
  const request = allChangeRequests().find(
    (item) =>
      item.id === requestId &&
      (!organizationId || item.organizationId === organizationId),
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
  return request;
}

function closeRequest(requestId, viewer, status, decisionNote = null) {
  changeChangeRequest(requestId, {
    status,
    decidedByUserId: viewer.user.id,
    decidedAt: new Date().toISOString(),
    decisionNote,
  });
  return requestView(
    allChangeRequests().find((item) => item.id === requestId),
    viewer,
  );
}

export function cancelChangeRequest(requestId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLAN_CHANGE_REQUESTS_CREATE);
    pendingRequestById(requestId, viewer.organization.id);
    return respond(closeRequest(requestId, viewer, 'cancelled'));
  });
}

/**
 * A plataforma aprova: o plano pedido passa a valer num termo novo, com data
 * de fim, limites e justificativa opcionais pela regra da atribuição.
 */
export function approveChangeRequest(requestId, body = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLATFORM_ORGANIZATIONS_UPDATE);
    const errors = planTermFieldErrors(body, { noteField: 'decisionNote' });
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const now = new Date();
    assertEndInFuture(body, now);
    const request = pendingRequestById(requestId, null);
    const plan = findPlan(request.requestedPlan.id);
    if (!plan) {
      throw error(
        422,
        'PLAN_NOT_FOUND',
        'Plano de uso inexistente ou indisponível.',
      );
    }
    assertTermRule(body, plan, now);
    openTerm(request.organizationId, plan, body, 'change_request', now);
    return respond(
      closeRequest(
        requestId,
        viewer,
        'approved',
        trimmed(body.decisionNote) ?? null,
      ),
    );
  });
}

/** A plataforma recusa com justificativa, que a organização vê. */
export function rejectChangeRequest(requestId, { decisionNote } = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLATFORM_ORGANIZATIONS_UPDATE);
    const code = decisionNoteError(decisionNote);
    if (code) {
      throw validationError([{ field: 'decisionNote', code }]);
    }
    pendingRequestById(requestId, null);
    return respond(
      closeRequest(requestId, viewer, 'rejected', decisionNote.trim()),
    );
  });
}

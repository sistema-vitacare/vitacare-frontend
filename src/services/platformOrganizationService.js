// Organizações clientes para o administrador da plataforma, no formato das
// rotas `organizations` e `organizations/{id}` (manual e mensagens de erro
// conferidos em 16/11/2026, commit `e1cf219`). O plano de cada organização
// fica em `organizationService.js`, junto do plano da organização da sessão.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { platformOrganization } from '../data/mocks/platform.js';
import { newOrganizationErrors } from '../utils/organizationFields.js';
import { generateTemporaryPassword } from '../utils/temporaryPassword.js';
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
  addOrganization,
  allClientOrganizations,
  changeOrganization,
  findOrganization,
  findPlan,
} from './organizationStore.js';
import {
  assertDocumentAvailable,
  saveOrganization,
} from './organizationService.js';
import { nextId } from './patientStore.js';

const error = (status, code, message, fields = null) =>
  new ApiError({ status, code, message, fields });

const notFound = () =>
  error(404, 'ORGANIZATION_NOT_FOUND', 'Organização não encontrada.');

function viewerFor(permission) {
  const viewer = currentViewer();
  requirePermission(viewer, permission);
  return viewer;
}

function reachable(organizationId) {
  const organization = findOrganization(organizationId);
  if (!organization) {
    throw notFound();
  }
  return organization;
}

export function listOrganizations({ status, search, page, limit } = {}) {
  return mockRequest(() => {
    viewerFor(P.PLATFORM_ORGANIZATIONS_READ);
    const term = search?.trim().toLowerCase();
    const items = allClientOrganizations()
      .filter((item) => !status || item.status === status)
      .filter(
        (item) =>
          !term ||
          [item.tradeName, item.legalName, item.code].some((value) =>
            value?.toLowerCase().includes(term),
          ),
      )
      .sort((a, b) => a.tradeName.localeCompare(b.tradeName, 'pt-BR'));
    return paginate(items, { page, limit });
  });
}

export function getOrganization(organizationId) {
  return mockRequest(() => {
    viewerFor(P.PLATFORM_ORGANIZATIONS_READ);
    return respond(reachable(organizationId));
  });
}

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);
const optional = (value) => trimmed(value) ?? null;

/**
 * Cadastro da organização com o primeiro administrador, numa operação só,
 * como `POST /organizations`. A senha provisória só existe nesta resposta;
 * o administrador entra no uso da organização, e não nos usuários
 * simulados, que são só da organização de demonstração.
 */
export function createOrganization(body = {}) {
  return mockRequest(() => {
    viewerFor(P.PLATFORM_ORGANIZATIONS_CREATE);
    const errors = newOrganizationErrors(body);
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const plan = findPlan(body.usagePlanId);
    if (!plan) {
      throw error(
        422,
        'ORGANIZATION_PLAN_NOT_FOUND',
        'Plano de uso inexistente ou indisponível.',
        [{ field: 'usagePlanId', code: 'NOT_FOUND' }],
      );
    }
    // O código é único entre todas as organizações, inclusive a da
    // plataforma, porque identifica a organização no login.
    const code = body.code.trim().toLowerCase();
    if (
      [...allClientOrganizations(), platformOrganization].some(
        (item) => item.code === code,
      )
    ) {
      throw error(
        409,
        'ORGANIZATION_CODE_TAKEN',
        'Já existe uma organização com este código.',
        [{ field: 'code', code: 'DUPLICATE' }],
      );
    }
    const document = optional(body.document);
    assertDocumentAvailable(document);
    const now = new Date().toISOString();
    const organization = {
      id: nextId('0f9a3c10'),
      code,
      kind: 'tenant',
      tradeName: body.tradeName.trim(),
      legalName: optional(body.legalName),
      document,
      phone: optional(body.phone),
      email: optional(body.email),
      status: 'active',
      usagePlanId: plan.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    addOrganization(organization, {
      id: nextId('6f1d0c2e'),
      organizationId: organization.id,
      planId: plan.id,
      startsAt: now,
      endsAt: null,
      origin: 'initial',
      userLimit: null,
      patientLimit: null,
    });
    const { administrator } = body;
    return respond({
      organization,
      administrator: {
        id: nextId('b594e98b'),
        name: administrator.name.trim(),
        email: administrator.email.trim().toLowerCase(),
      },
      temporaryPassword: generateTemporaryPassword(),
    });
  });
}

export function updateOrganization(organizationId, body = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.PLATFORM_ORGANIZATIONS_UPDATE);
    return respond(saveOrganization(viewer, organizationId, body));
  });
}

/**
 * Inativar corta na hora o acesso de todos os usuários da organização, sem
 * mudar a situação deles; reativar devolve o acesso por novo login, sem as
 * sessões e os convites revogados.
 */
export function deactivateOrganization(organizationId) {
  return mockRequest(() => {
    viewerFor(P.PLATFORM_ORGANIZATIONS_CHANGE_STATUS);
    const organization = reachable(organizationId);
    if (organization.kind === 'platform') {
      throw error(
        409,
        'ORGANIZATION_PLATFORM_PROTECTED',
        'A organização da plataforma não pode ser inativada.',
      );
    }
    if (organization.status === 'inactive') {
      throw error(
        409,
        'ORGANIZATION_ALREADY_INACTIVE',
        'A organização já está inativa.',
      );
    }
    const now = new Date().toISOString();
    changeOrganization(organizationId, {
      status: 'inactive',
      deletedAt: now,
      updatedAt: now,
    });
    return respond(findOrganization(organizationId));
  });
}

export function reactivateOrganization(organizationId) {
  return mockRequest(() => {
    viewerFor(P.PLATFORM_ORGANIZATIONS_CHANGE_STATUS);
    if (reachable(organizationId).status === 'active') {
      throw error(
        409,
        'ORGANIZATION_ALREADY_ACTIVE',
        'A organização já está ativa.',
      );
    }
    changeOrganization(organizationId, {
      status: 'active',
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return respond(findOrganization(organizationId));
  });
}

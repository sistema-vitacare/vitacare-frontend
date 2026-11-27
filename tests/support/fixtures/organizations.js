// Catálogo de planos, organizações, plano de uma organização e solicitações
// de mudança de plano no formato da API (`plans-listar.md`,
// `plans-consultar-proprio.md`, `organizations-listar.md` e
// `plan-change-requests-criar.md`), para os testes das configurações, da
// plataforma, dos usuários e do roteador. Nenhuma regra do backend é
// aplicada: a API calcula limites, uso e aviso; o teste diz o que ela
// devolveria.
import { organization as ownOrganization } from '../data/organization.js';
import { platformOrganization } from '../data/platform.js';
import { apiFailure, apiPage } from '../apiStub.js';

export const BASIC = Object.freeze({
  id: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  code: 'basic',
  name: 'Basic',
  description:
    'Indicado para clínicas, consultórios e operações de pequeno porte que desejam organizar o acompanhamento de pacientes em uma estrutura inicial de uso.',
  userLimit: 10,
  patientLimit: 200,
  features: [
    'patient_management',
    'health_records',
    'patient_history',
    'automatic_alerts',
    'responsive_access',
  ],
  monthlyPrice: '499.00',
  expandable: false,
});

export const ENTERPRISE = Object.freeze({
  id: '7b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  code: 'enterprise',
  name: 'Enterprise',
  description:
    'Indicado para clínicas maiores, empresas de home care e instituições com maior volume de profissionais, pacientes e necessidade de controle operacional.',
  userLimit: 50,
  patientLimit: 1000,
  features: [
    'patient_management',
    'health_records',
    'patient_history',
    'automatic_alerts',
    'responsive_access',
    'extended_registration',
    'management_reports',
    'operational_dashboard',
    'custom_deployment',
  ],
  monthlyPrice: '1990.00',
  expandable: true,
});

/** `GET /plans`: o catálogo, sem paginação. */
export const PLANS = Object.freeze([BASIC, ENTERPRISE]);

const summary = ({ id, code, name }) => ({ id, code, name });

/** Organização cliente como a plataforma a vê, com o `kind`. */
export function apiOrganization({
  id,
  code,
  tradeName,
  legalName = null,
  document = null,
  phone = null,
  email = null,
  status = 'active',
  usagePlanId = BASIC.id,
  createdAt = '2026-10-01T12:00:00.000Z',
}) {
  return {
    id,
    code,
    kind: 'tenant',
    tradeName,
    legalName,
    document,
    phone,
    email,
    status,
    usagePlanId,
    createdAt,
    updatedAt: createdAt,
    deletedAt: status === 'inactive' ? '2026-11-10T12:00:00.000Z' : null,
  };
}

export const SOL_NASCENTE = apiOrganization({
  id: '0f1e2d3c-4b5a-4968-8776-655443322110',
  code: 'clinica-sol-nascente',
  tradeName: 'Clínica Sol Nascente',
  legalName: 'Clínica Sol Nascente Ltda.',
  document: '11.222.333/0001-81',
  phone: '(16) 3333-0000',
  email: 'contato@solnascente.example',
});
export const VIVA_BEM = apiOrganization({
  id: '1a2b3c4d-5e6f-4a70-8b91-a2b3c4d5e6f7',
  code: 'casa-viva-bem',
  tradeName: 'Casa Viva Bem',
  usagePlanId: ENTERPRISE.id,
  status: 'inactive',
});

/** A organização da sessão do administrador dos testes, sem o `kind`. */
export const OWN_ORGANIZATION = Object.freeze({
  id: ownOrganization.id,
  code: ownOrganization.code,
  tradeName: ownOrganization.tradeName,
  legalName: ownOrganization.legalName,
  document: ownOrganization.document,
  phone: ownOrganization.phone,
  email: ownOrganization.email,
  status: 'active',
  usagePlanId: ENTERPRISE.id,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
  deletedAt: null,
});

/** A organização de plataforma, como `GET /organizations/me` a devolve ao master. */
export const PLATFORM_ORGANIZATION = Object.freeze({ ...platformOrganization });

/** Solicitação de mudança de plano, pendente salvo indicação. */
export function apiChangeRequest({
  id = '3333333a-0000-4000-8000-00000000000a',
  organizationId = SOL_NASCENTE.id,
  currentPlan = BASIC,
  requestedPlan = ENTERPRISE,
  notes = 'Precisamos de mais vagas.',
  status = 'pending',
  decisionNote = null,
  createdAt = '2026-11-03T12:00:00.000Z',
} = {}) {
  const decided = status !== 'pending';
  return {
    id,
    organizationId,
    currentPlan: summary(currentPlan),
    requestedPlan: summary(requestedPlan),
    notes,
    status,
    requestedByUserId: '1111111a-0000-4000-8000-00000000000a',
    decidedByUserId: null,
    decidedAt: decided ? '2026-11-04T12:00:00.000Z' : null,
    decisionNote,
    createdAt,
  };
}

/**
 * Plano de uma organização como `GET /organizations/me/plan` e
 * `GET /organizations/{organizationId}/plan` o devolvem; `message` vai na
 * `meta`, como o aviso de vencimento.
 */
export function apiOrganizationPlan({
  organizationId = SOL_NASCENTE.id,
  plan = BASIC,
  endsAt = null,
  expiryWarning = null,
  origin = 'initial',
  userLimit = null,
  patientLimit = null,
  usage = { users: 7, patients: 42 },
  pendingChangeRequest = null,
  message,
} = {}) {
  return {
    data: {
      organizationId,
      plan,
      term: {
        id: '9c8b7a6f-5e4d-4c3b-8a29-18f7e6d5c4b3',
        startsAt: '2026-11-01T10:00:00.000Z',
        endsAt,
        status: expiryWarning === 'expired' ? 'expired' : 'active',
        expiryWarning,
        origin,
        userLimit,
        patientLimit,
      },
      limits: {
        users: userLimit ?? plan.userLimit,
        patients: patientLimit ?? plan.patientLimit,
      },
      usage,
      pendingChangeRequest,
    },
    meta: message ? { message } : {},
  };
}

/**
 * Rotas da plataforma: a lista com as organizações dadas, a consulta e o
 * plano de cada uma, o catálogo e as solicitações pendentes; outro id
 * responde `404 ORGANIZATION_NOT_FOUND`.
 */
export function platformRoutes({
  organizations = [SOL_NASCENTE, VIVA_BEM],
  requests = [],
} = {}) {
  const find = (id) => organizations.find((item) => item.id === id);
  const notFound = () =>
    apiFailure(404, 'ORGANIZATION_NOT_FOUND', 'Organização não encontrada.');
  return {
    'GET /organizations': () => apiPage(organizations),
    'GET /organizations/:organizationId': ({ params }) =>
      find(params.organizationId)
        ? { data: find(params.organizationId), meta: {} }
        : notFound(),
    'GET /organizations/:organizationId/plan': ({ params }) =>
      find(params.organizationId)
        ? apiOrganizationPlan({
            organizationId: params.organizationId,
            plan:
              find(params.organizationId).usagePlanId === ENTERPRISE.id
                ? ENTERPRISE
                : BASIC,
          })
        : notFound(),
    'GET /plans': () => ({ data: PLANS, meta: {} }),
    'GET /plan-change-requests': () => apiPage(requests),
  };
}

/** Rotas das configurações do administrador: a organização e o plano dela. */
export function settingsRoutes({
  organization = OWN_ORGANIZATION,
  plan = apiOrganizationPlan({
    organizationId: OWN_ORGANIZATION.id,
    plan: ENTERPRISE,
  }),
} = {}) {
  return {
    'GET /organizations/me': () => ({ data: organization, meta: {} }),
    'GET /organizations/me/plan': () => plan,
    'GET /plans': () => ({ data: PLANS, meta: {} }),
  };
}

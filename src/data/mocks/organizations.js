// Organizações clientes, no formato de GET /organizations, que só o
// administrador da plataforma lê, com o termo de vigência de cada uma, o uso
// das que não têm dados simulados e as solicitações de mudança de plano. A
// primeira é a da sessão de demonstração; as outras existem para o filtro
// por organização da auditoria e para as telas da plataforma.
import { todayInSaoPaulo } from '../../utils/format.js';
import { shiftDays } from '../../utils/period.js';
import { endOfDayInSaoPaulo } from '../../utils/planTerm.js';
import { organization } from './organization.js';
import { BASIC_PLAN, ENTERPRISE_PLAN, organizationTerm } from './plans.js';

export const BEM_VIVER_ID = 'cecd71bf-0168-5d1b-bd8e-ca3083210067';
export const LAR_SAO_FRANCISCO_ID = '11e6e36d-7904-5442-b1f1-c6ce12fc5f74';

export const clientOrganizations = [
  organization,
  {
    id: BEM_VIVER_ID,
    code: 'bem-viver',
    kind: 'tenant',
    tradeName: 'Clínica Bem Viver',
    legalName: 'Bem Viver Serviços de Saúde Ltda.',
    document: '58.214.903/0001-07',
    phone: '(16) 3911-4520',
    email: 'contato@bemviver.example',
    status: 'active',
    usagePlanId: BASIC_PLAN.id,
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z',
    deletedAt: null,
  },
  {
    id: LAR_SAO_FRANCISCO_ID,
    code: 'lar-sao-francisco',
    kind: 'tenant',
    tradeName: 'Lar São Francisco',
    legalName: null,
    document: null,
    phone: null,
    email: null,
    status: 'inactive',
    usagePlanId: BASIC_PLAN.id,
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-10-30T12:00:00.000Z',
    deletedAt: '2026-10-30T12:00:00.000Z',
  },
];

// Usuários (convidados e ativos) e pacientes ativos das organizações que não
// têm usuários nem pacientes nos dados simulados, que são só da organização
// de demonstração. Para ela, o uso sai dos estados, como na API.
export const simulatedUsage = {
  [BEM_VIVER_ID]: { users: 7, patients: 64 },
  [LAR_SAO_FRANCISCO_ID]: { users: 3, patients: 0 },
};

// A Bem Viver vence em 5 dias, sempre a partir da consulta, para que o aviso
// de vencimento da API apareça na tela da plataforma; datas fixas venceriam
// de vez poucos dias depois.
const BEM_VIVER_TERM_DAYS = 5;

/** Termos correntes das três organizações clientes, no instante `now`. */
export function clientTermsAsOf(now = new Date()) {
  return [
    organizationTerm,
    {
      id: '6f1d0c2e-0b9f-5a77-9a62-3c58d1f0a811',
      organizationId: BEM_VIVER_ID,
      planId: BASIC_PLAN.id,
      startsAt: '2026-09-15T12:00:00.000Z',
      endsAt: endOfDayInSaoPaulo(
        shiftDays(todayInSaoPaulo(now), BEM_VIVER_TERM_DAYS),
      ),
      origin: 'initial',
      userLimit: null,
      patientLimit: null,
    },
    {
      id: '8b7e4a90-5d21-5c3f-8e17-0f6a2b9c4d33',
      organizationId: LAR_SAO_FRANCISCO_ID,
      planId: BASIC_PLAN.id,
      startsAt: '2026-09-20T12:00:00.000Z',
      endsAt: null,
      origin: 'initial',
      userLimit: null,
      patientLimit: null,
    },
  ];
}

const planSummary = ({ id, code, name }) => ({ id, code, name });
const DAY_MS = 24 * 60 * 60 * 1000;

// Lúcia Andrade Rocha, administradora da Bem Viver nos eventos de auditoria.
const BEM_VIVER_ADMIN_ID = 'b594e98b-f8e4-538e-85c6-2bb7248de350';

/**
 * Solicitações de mudança de plano simuladas, no formato de
 * GET /plan-change-requests: a Bem Viver pediu o Enterprise dois dias antes
 * da consulta, para que a fila da plataforma não nasça vazia.
 */
export function changeRequestsAsOf(now = new Date()) {
  return [
    {
      id: 'c4a9e000-0000-5000-9000-000000000001',
      organizationId: BEM_VIVER_ID,
      currentPlan: planSummary(BASIC_PLAN),
      requestedPlan: planSummary(ENTERPRISE_PLAN),
      notes: 'Vamos abrir a segunda unidade e passar de 10 usuários.',
      status: 'pending',
      requestedByUserId: BEM_VIVER_ADMIN_ID,
      decidedByUserId: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
    },
  ];
}

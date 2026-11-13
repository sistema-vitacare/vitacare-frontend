// Catálogo de planos do Quadro 2 do TCC, no formato de GET /plans (manual
// `plans-listar.md` e migration `1790600000000-ApplyPlanCatalogRules`,
// conferidos em 12/11/2026), e o termo de vigência da organização de
// demonstração. A organização fica no Enterprise para que o painel
// operacional, que só existe nele, apareça na página inicial do
// administrador.
import { PLAN_FEATURES } from '../../constants/plans.js';
import { organization } from './organization.js';

const BASIC_FEATURES = PLAN_FEATURES.slice(0, 5);

export const BASIC_PLAN = Object.freeze({
  id: 'd01578d8-133d-5d4f-910d-164cb5daa4c7',
  code: 'basic',
  name: 'Basic',
  description:
    'Indicado para clínicas, consultórios e operações de pequeno porte que desejam organizar o acompanhamento de pacientes em uma estrutura inicial de uso.',
  userLimit: 10,
  patientLimit: 200,
  features: BASIC_FEATURES,
  monthlyPrice: '499.00',
  expandable: false,
});

export const ENTERPRISE_PLAN = Object.freeze({
  id: organization.usagePlanId,
  code: 'enterprise',
  name: 'Enterprise',
  description:
    'Indicado para clínicas maiores, empresas de home care e instituições com maior volume de profissionais, pacientes e necessidade de controle operacional.',
  userLimit: 50,
  patientLimit: 1000,
  features: [...PLAN_FEATURES],
  monthlyPrice: '1990.00',
  expandable: true,
});

export const plans = [BASIC_PLAN, ENTERPRISE_PLAN];

// Termo corrente da organização, sem vencimento. O aviso e a situação são
// calculados na consulta, como na API.
export const organizationTerm = Object.freeze({
  id: '210b3451-93a0-5fca-8866-d9b9501a05af',
  organizationId: organization.id,
  planId: ENTERPRISE_PLAN.id,
  startsAt: '2026-09-02T13:20:00.000Z',
  endsAt: null,
  origin: 'initial',
  userLimit: null,
  patientLimit: null,
});

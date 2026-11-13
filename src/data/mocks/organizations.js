// Organizações clientes, no formato de GET /organizations, que só o
// administrador da plataforma lê. A primeira é a da sessão de demonstração;
// as outras existem para o filtro por organização da auditoria e para a
// tela de organizações da plataforma.
import { organization } from './organization.js';
import { BASIC_PLAN } from './plans.js';

export const BEM_VIVER_ID = 'cecd71bf-0168-5d1b-bd8e-ca3083210067';

export const clientOrganizations = [
  organization,
  {
    id: BEM_VIVER_ID,
    code: 'bem-viver',
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
    id: '11e6e36d-7904-5442-b1f1-c6ce12fc5f74',
    code: 'lar-sao-francisco',
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

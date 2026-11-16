// Textos do plano das organizações na plataforma (FE-28, UC04): fila de
// solicitações, página da organização, atribuição, aprovação e recusa. O
// resumo do plano usa os textos de `planSummary.js`.
import { PLAN_LIMIT_MAX, PLAN_NOTE_MAX } from '../utils/planTerm.js';
import { formatNumber } from '../utils/format.js';

export const pendingRequestsContent = {
  title: 'Solicitações em análise',
  change: (from, to) => `${from} → ${to}`,
  requestedAt: (when) => `Pedida em ${when}`,
  notes: (text) => `Observação: ${text}`,
  unknownOrganization: 'Organização sem nome',
  unavailable: 'Não foi possível carregar as solicitações em análise.',
  retry: 'Tentar de novo',
};

export const organizationDetailContent = {
  notFound: 'Organização não encontrada.',
  notFoundText:
    'O endereço pode estar errado, ou a organização não é uma organização cliente.',
  backToList: 'Voltar às organizações',
};

export const organizationPlanContent = {
  title: 'Plano e uso',
  assign: 'Atribuir plano',
  pendingTitle: 'Solicitação em análise',
  pending: (from, to, when) => `${from} → ${to}, pedida em ${when}`,
  notes: (text) => `Observação: ${text}`,
  approve: 'Aprovar',
  reject: 'Recusar',
  assigned: 'Plano atribuído.',
  approved: 'Solicitação aprovada. O plano pedido já vale.',
  rejected: 'Solicitação recusada. A organização vê a justificativa.',
};

export const planTermFormContent = {
  assignTitle: 'Atribuir plano',
  assignIntro:
    'O termo atual termina agora, e um novo começa com o plano escolhido. Campo em branco volta ao padrão: sem data de fim e com os limites do plano. A solicitação em análise, se houver, continua pendente.',
  approveTitle: 'Aprovar solicitação',
  approveIntro: (plan) =>
    `O plano ${plan} passa a valer agora, num termo novo, e o atual termina. Campo em branco volta ao padrão: sem data de fim e com os limites do plano.`,
  plan: 'Plano',
  endsAt: 'Fim da vigência (opcional)',
  endsAtHelper:
    'Vale até 23:59 do dia, no horário de Brasília. Em branco, sem data de fim.',
  userLimit: 'Limite de usuários (opcional)',
  patientLimit: 'Limite de pacientes (opcional)',
  limitHelper: (limit) => `Em branco, vale o do plano: ${limit}. Só aumenta.`,
  fixedLimits: (users, patients) =>
    `Limites fixos de ${users} usuários e ${patients} pacientes ativos. Só o plano Enterprise admite expansão.`,
  reason: 'Motivo (opcional)',
  decisionNote: 'Justificativa (opcional)',
  noteHelper: `Até ${PLAN_NOTE_MAX} caracteres.`,
  cancel: 'Cancelar',
  assign: 'Atribuir plano',
  approve: 'Aprovar',
  invalidFields: 'Confira os campos destacados.',
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export const rejectRequestContent = {
  title: 'Recusar solicitação',
  intro:
    'A organização vê a justificativa, e o plano atual continua como está.',
  decisionNote: 'Justificativa',
  noteHelper: `Até ${PLAN_NOTE_MAX} caracteres.`,
  cancel: 'Cancelar',
  reject: 'Recusar',
  unexpected: 'Não foi possível recusar agora. Tente de novo em instantes.',
};

const limitErrors = {
  IS_INT: 'Use um número inteiro.',
  MIN: 'Use um número inteiro.',
  MAX: `Use no máximo ${formatNumber(PLAN_LIMIT_MAX)}.`,
  NOT_EXPANDABLE: 'Este plano tem limites fixos.',
  BELOW_CATALOG: 'Use pelo menos o limite do plano, ou deixe em branco.',
  default: 'Confira o limite.',
};

// Mensagem por campo e pelo código da regra (API ou tela). Motivo e
// justificativa usam as mesmas mensagens, em `note`.
export const planTermFieldErrors = {
  planId: {
    NOT_FOUND: 'Este plano não está disponível. Escolha outro.',
    default: 'Escolha o plano.',
  },
  endsAt: {
    IN_PAST: 'Escolha hoje ou uma data futura.',
    default: 'Informe uma data válida.',
  },
  userLimit: limitErrors,
  patientLimit: limitErrors,
  note: {
    MIN_LENGTH: 'Informe a justificativa.',
    MAX_LENGTH: `Use no máximo ${PLAN_NOTE_MAX} caracteres.`,
    default: 'Informe a justificativa.',
  },
};

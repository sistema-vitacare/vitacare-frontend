// Eventos de auditoria no formato da API (`audit-events-listar.md`,
// `audit-events-detalhe.md` e `audit-events-acoes.md`), para os testes da
// auditoria e do roteador. Nenhuma regra do backend é aplicada: a API filtra,
// pagina e mascara; o teste diz o que ela devolveria.
import { organization } from '../../../src/data/mocks/organization.js';
import { apiFailure, apiPage } from '../apiStub.js';

export const eventId = (sequence) =>
  `a0d17000-0000-5000-8000-${String(sequence).padStart(12, '0')}`;

export const PATRICIA = '2fb0cec5-0e79-5ae3-9dd8-bea87be4292f';
export const BEM_VIVER = {
  id: 'cecd71bf-0168-5d1b-bd8e-ca3083210067',
  name: 'Clínica Bem Viver',
};
const IPE = { id: organization.id, name: organization.tradeName };
const HELENA = {
  type: 'user',
  user: { id: 'u-helena', name: 'Helena Vasconcelos' },
  profile: { code: 'admin', name: 'Administrador' },
};
const SYSTEM = { type: 'system', user: null, profile: null };

/** Catálogo de ações, como `GET /audit-events/actions`. */
export const AUDIT_ACTIONS = [
  {
    action: 'auth.login_succeeded',
    label: 'Entrou no sistema',
    severity: 'normal',
  },
  {
    action: 'user.profile_changed',
    label: 'Alterou perfil de usuário',
    severity: 'warning',
  },
  { action: 'alert.generated', label: 'Gerou alerta', severity: 'critical' },
  {
    action: 'medication.updated',
    label: 'Editou medicamento',
    severity: 'normal',
  },
  {
    action: 'form.published',
    label: 'Publicou formulário',
    severity: 'normal',
  },
  { action: 'user.created', label: 'Cadastrou usuário', severity: 'normal' },
  {
    action: 'organization.updated',
    label: 'Editou organização',
    severity: 'normal',
  },
];

function event(
  sequence,
  {
    action,
    organization: org = IPE,
    actor = HELENA,
    entity,
    ipAddress = '192.0.2.10',
    occurredAt,
    after = null,
  },
) {
  const { label, severity } = AUDIT_ACTIONS.find(
    (item) => item.action === action,
  );
  return {
    id: eventId(sequence),
    occurredAt,
    organization: org,
    actor,
    action,
    actionLabel: label,
    severity,
    entity,
    ipAddress: actor.type === 'system' ? null : ipAddress,
    requestId: actor.type === 'system' ? null : `req-${sequence}`,
    beforeValues: null,
    afterValues: after,
  };
}

/** Eventos com o detalhe; a lista leva os mesmos campos, sem os valores. */
export const AUDIT_EVENTS = [
  event(9, {
    action: 'user.profile_changed',
    occurredAt: '2026-11-12T09:00:00.000Z',
    entity: { type: 'user', id: PATRICIA, label: 'Patrícia Lemos Duarte' },
    after: { fromProfile: 'admin', toProfile: 'professional' },
  }),
  event(8, {
    action: 'form.published',
    occurredAt: '2026-11-11T14:00:00.000Z',
    entity: { type: 'follow_up_form', id: 'form-1', label: 'Sinais vitais' },
    after: { versionNumber: 2, impactConfirmed: true },
  }),
  event(5, {
    action: 'medication.updated',
    occurredAt: '2026-11-10T10:00:00.000Z',
    entity: { type: 'medication', id: 'med-1', label: 'Losartana potássica' },
    after: { changedFields: ['times', 'notes'] },
  }),
  event(3, {
    action: 'alert.generated',
    actor: SYSTEM,
    occurredAt: '2026-11-09T12:00:00.000Z',
    entity: { type: 'alert', id: 'alert-1', label: null },
  }),
  event(16, {
    action: 'organization.updated',
    occurredAt: '2026-11-08T09:00:00.000Z',
    entity: { type: 'organization', id: IPE.id, label: IPE.name },
    after: { changedFields: ['phone'] },
  }),
  // De outra organização: o administrador da plataforma vê os nomes de
  // pessoas mascarados pela API.
  event(23, {
    action: 'user.created',
    organization: BEM_VIVER,
    actor: {
      type: 'user',
      user: { id: 'u-lucia', name: 'L**** A****** R****' },
      profile: { code: 'admin', name: 'Administrador' },
    },
    occurredAt: '2026-11-07T09:00:00.000Z',
    entity: { type: 'user', id: 'u-otavio', label: 'O***** R***' },
  }),
];

// A lista não leva os valores gravados, que só o detalhe traz.
const DETAIL_ONLY = ['beforeValues', 'afterValues'];
const listed = (item) =>
  Object.fromEntries(
    Object.entries(item).filter(([key]) => !DETAIL_ONLY.includes(key)),
  );

/**
 * Rotas da auditoria: a lista responde `events` com `total` e a mensagem da
 * lista vazia; o detalhe acha o evento pelo id, ou responde 404.
 */
export function auditRoutes({
  events = AUDIT_EVENTS,
  total,
  known = AUDIT_EVENTS,
} = {}) {
  return {
    'GET /audit-events': () =>
      apiPage(events.map(listed), {
        total: total ?? events.length,
        message:
          events.length === 0
            ? 'Nenhum evento de auditoria para os filtros selecionados.'
            : undefined,
      }),
    'GET /audit-events/actions': () => ({ data: AUDIT_ACTIONS, meta: {} }),
    'GET /audit-events/:eventId': ({ params }) => {
      const found = known.find((item) => item.id === params.eventId);
      return found
        ? { data: found, meta: {} }
        : apiFailure(
            404,
            'AUDIT_EVENT_NOT_FOUND',
            'Evento de auditoria não encontrado.',
          );
    },
  };
}

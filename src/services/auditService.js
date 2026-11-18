// Auditoria simulada, no formato das rotas `audit-events` (manual
// `audit-events-*.md`, conferido em 12/11/2026). O administrador consulta a
// própria organização; o administrador da plataforma consulta todas, com os
// nomes de pessoas de outra organização mascarados. As ações feitas na
// sessão simulada não geram evento. Na integração, cada função passa a
// chamar a rota, e a tela salva o CSV do mesmo jeito.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { auditActions } from '../data/mocks/auditActions.js';
import { auditEventsAsOf } from '../data/mocks/auditEvents.js';
import { auditCsvFileName, toAuditCsv } from '../utils/auditCsv.js';
import { isInPeriod } from '../utils/dashboard.js';
import { maskPersonName, todayInSaoPaulo } from '../utils/format.js';
import { resolvePeriod } from '../utils/period.js';
import { sessionAuditEvents } from './auditStore.js';
import { currentViewer } from './authService.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';

const EXPORT_LIMIT = 10000;
const EMPTY_MESSAGE =
  'Nenhum evento de auditoria para os filtros selecionados.';
const PERSON_ENTITIES = ['user', 'patient'];

// Sem acento e sem caixa, como a busca da API.
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A plataforma vê todas as organizações; o administrador, só a própria. */
function scope(viewer) {
  return viewer.organization.kind === 'platform'
    ? null
    : viewer.organization.id;
}

function maskForeign(event, viewer) {
  if (event.organization.id === viewer.organization.id) {
    return event;
  }
  const { actor, entity } = event;
  return {
    ...event,
    actor: actor.user
      ? {
          ...actor,
          user: { ...actor.user, name: maskPersonName(actor.user.name) },
        }
      : actor,
    entity:
      PERSON_ENTITIES.includes(entity.type) && entity.label
        ? { ...entity, label: maskPersonName(entity.label) }
        : entity,
  };
}

function matchesSearch(event, search, viewer) {
  const term = fold(search.trim());
  // O nome do responsável só é procurado nos eventos da organização da
  // sessão, como na API: o de outra organização sai mascarado.
  const ownName =
    event.organization.id === viewer.organization.id &&
    event.actor.user &&
    fold(event.actor.user.name).includes(term);
  return (
    ownName ||
    fold(event.action).includes(term) ||
    fold(event.actionLabel).includes(term)
  );
}

// Os eventos simulados e as exportações em PDF feitas na sessão, que também
// são auditadas.
const allEvents = (now) => [...sessionAuditEvents(), ...auditEventsAsOf(now)];

function filteredEvents(query, viewer, now) {
  const { period, errors } = resolvePeriod(query, todayInSaoPaulo(now));
  if (errors.length > 0) {
    throw validationError(errors);
  }
  const own = scope(viewer);
  const organizationId = own ?? query.organizationId;
  const events = allEvents(now).filter(
    (event) =>
      isInPeriod(event.occurredAt, period) &&
      (!organizationId || event.organization.id === organizationId) &&
      (!query.action || event.action === query.action) &&
      (!query.severity || event.severity === query.severity) &&
      (!query.actorType || event.actor.type === query.actorType) &&
      (!query.actorUserId || event.actor.user?.id === query.actorUserId) &&
      (!query.search || matchesSearch(event, query.search, viewer)),
  );
  return { period, events: events.map((event) => maskForeign(event, viewer)) };
}

// A lista não traz os valores gravados, que ficam no detalhe.
function listItem(event) {
  const item = { ...event };
  delete item.beforeValues;
  delete item.afterValues;
  return item;
}

export function listAuditEvents(query = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.AUDIT_EVENTS_READ);
    const { events } = filteredEvents(query, viewer, new Date());
    const result = paginate(events.map(listItem), {
      page: query.page,
      limit: query.limit,
    });
    if (events.length === 0) {
      result.meta.message = EMPTY_MESSAGE;
    }
    return result;
  });
}

export function listAuditActions() {
  return mockRequest(() => {
    requirePermission(currentViewer(), P.AUDIT_EVENTS_READ);
    return respond(auditActions);
  });
}

export function getAuditEvent(eventId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.AUDIT_EVENTS_READ);
    const own = scope(viewer);
    const event = allEvents(new Date()).find(
      (item) => item.id === eventId && (!own || item.organization.id === own),
    );
    if (!event) {
      throw new ApiError({
        status: 404,
        code: 'AUDIT_EVENT_NOT_FOUND',
        message: 'Evento de auditoria não encontrado.',
      });
    }
    return respond(maskForeign(event, viewer));
  });
}

/** CSV com os filtros da lista, no formato e com o nome de arquivo da API. */
export function exportAuditEvents(query = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.AUDIT_EVENTS_EXPORT);
    const { period, events } = filteredEvents(query, viewer, new Date());
    if (events.length > EXPORT_LIMIT) {
      throw new ApiError({
        status: 422,
        code: 'AUDIT_EXPORT_TOO_MANY_EVENTS',
        message:
          'Há eventos demais para exportar de uma vez. Estreite o período ou os filtros.',
      });
    }
    return respond({
      blob: new Blob([toAuditCsv(events)], { type: 'text/csv;charset=utf-8' }),
      fileName: auditCsvFileName(period),
    });
  });
}

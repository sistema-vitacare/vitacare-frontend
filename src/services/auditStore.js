// Eventos de auditoria gravados na sessão simulada. Só as exportações em PDF
// entram aqui: a lista de relatórios recentes e o "N gerados" são montados
// por elas, como na API, e sem gravá-las a lista nunca mudaria. As outras
// ações da sessão não geram evento.
import { auditActions } from '../data/mocks/auditActions.js';
import { registerMockState } from './mockApi.js';

const catalog = new Map(auditActions.map((item) => [item.action, item]));

let sessionEvents = [];
let sequence = 0;

registerMockState(() => {
  sessionEvents = [];
  sequence = 0;
});

/** Grava a exportação no formato do detalhe de GET /audit-events/{eventId}. */
export function recordExport({ viewer, action, entity, afterValues }) {
  sequence += 1;
  const item = catalog.get(action);
  sessionEvents = [
    {
      id: `a0d17000-0000-5000-9000-${String(sequence).padStart(12, '0')}`,
      occurredAt: new Date().toISOString(),
      organization: {
        id: viewer.organization.id,
        name: viewer.organization.tradeName,
      },
      actor: {
        type: 'user',
        user: { id: viewer.user.id, name: viewer.user.name },
        profile: viewer.user.profile,
      },
      action,
      actionLabel: item.label,
      severity: item.severity,
      entity,
      ipAddress: null,
      requestId: null,
      beforeValues: null,
      afterValues,
    },
    ...sessionEvents,
  ];
}

/** Do mais recente para o mais antigo, como a lista da API. */
export function sessionAuditEvents() {
  return sessionEvents;
}

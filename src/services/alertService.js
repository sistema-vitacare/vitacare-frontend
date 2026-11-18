// Alertas simulados, no formato das rotas `alerts` da API (manual
// `alerts-*.md`, conferido em 12/11/2026 no commit `dc0af9c` do backend):
// lista do paciente, detalhe e resolução. Na integração, cada função passa
// a chamar a rota correspondente.
import { PERMISSIONS as P } from '../constants/permissions.js';
import {
  findAlert,
  allAlerts,
  resolveAlert as markResolved,
} from './alertStore.js';
import { currentViewer } from './authService.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
} from './mockApi.js';
import { canReach, reachablePatient } from './patientStore.js';

function alertNotFound() {
  return new ApiError({
    status: 404,
    code: 'ALERT_NOT_FOUND',
    message: 'Alerta não encontrado.',
  });
}

/** Alerta de um paciente ao alcance da sessão; fora dele, `404` igual ao inexistente. */
function reachableAlert(viewer, alertId) {
  const alert = findAlert(alertId);
  if (!alert || !canReach(viewer, alert.patient.id)) {
    throw alertNotFound();
  }
  return alert;
}

/** Alertas do paciente, do mais novo ao mais antigo, com filtros de severidade e situação. */
export function listPatientAlerts({
  patientId,
  severity,
  status,
  page,
  limit,
}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERTS_READ);
    reachablePatient(viewer, patientId);
    const items = allAlerts(new Date())
      .filter((alert) => alert.patient.id === patientId)
      .filter((alert) => !severity || alert.severity === severity)
      .filter((alert) => !status || alert.status === status);
    return paginate(items, { page, limit });
  });
}

export function getAlert(alertId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERTS_READ);
    return respond(reachableAlert(viewer, alertId));
  });
}

/**
 * Resolve o alerta para todos, com quem resolveu e quando; não volta a
 * aberto. Vale também com o paciente inativo.
 */
export function resolveAlert(alertId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERTS_RESOLVE);
    const alert = reachableAlert(viewer, alertId);
    if (alert.status === 'resolved') {
      throw new ApiError({
        status: 409,
        code: 'ALERT_ALREADY_RESOLVED',
        message: 'O alerta já foi resolvido.',
      });
    }
    markResolved(alert.id, {
      resolvedAt: new Date().toISOString(),
      resolvedBy: { id: viewer.user.id, name: viewer.user.name },
    });
    return respond(findAlert(alert.id));
  });
}

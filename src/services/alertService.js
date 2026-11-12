// Alertas simulados, no formato de GET /alerts (manual `alerts-listar.md`,
// conferido em 11/11/2026 no commit `dc0af9c` do backend). Por ora, só a
// lista do paciente, que o registro de visita usa para mostrar os alertas
// que gerou; o detalhe e a resolução entram com a tela de alertas (FE-20).
import { PERMISSIONS as P } from '../constants/permissions.js';
import { currentViewer } from './authService.js';
import { allAlerts } from './followUpStore.js';
import { mockRequest, paginate, requirePermission } from './mockApi.js';
import { reachablePatient } from './patientStore.js';

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

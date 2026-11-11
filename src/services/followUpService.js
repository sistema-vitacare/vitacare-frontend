// Registros de acompanhamento simulados, no formato de GET /follow-ups
// (manual `follow-ups-listar.md`, conferido em 10/11/2026).
import { PERMISSIONS as P } from '../constants/permissions.js';
import { followUpsAsOf } from '../data/mocks/followUps.js';
import { todayInSaoPaulo } from '../utils/format.js';
import { currentViewer } from './authService.js';
import { mockRequest, paginate, requirePermission } from './mockApi.js';
import { isFamily, reachablePatient } from './patientStore.js';

/**
 * Registros de um paciente, do mais recente ao mais antigo, com filtros de
 * situação, período (dias de Brasília, inclusivos), formulário e autor.
 */
export function listFollowUps(query) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_HISTORY_READ);
    const { patientId, status, from, to, formId, authorUserId, page, limit } =
      query;
    reachablePatient(viewer, patientId);
    // O familiar nunca vê registro anulado.
    const family = isFamily(viewer);
    const items = followUpsAsOf(new Date())
      .filter((followUp) => followUp.patientId === patientId)
      .filter((followUp) => !family || followUp.status === 'valid')
      .filter((followUp) => !status || followUp.status === status)
      .filter((followUp) => !formId || followUp.form.id === formId)
      .filter(
        (followUp) => !authorUserId || followUp.author.id === authorUserId,
      )
      .filter((followUp) => {
        const day = todayInSaoPaulo(new Date(followUp.visitedAt));
        return (!from || day >= from) && (!to || day <= to);
      })
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    return paginate(items, { page, limit });
  });
}

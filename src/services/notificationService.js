// Caixa de notificações do próprio usuário pelas rotas `notifications` da API
// (manual `notifications-*.md`, conferido em 25/11/2026 no commit `3beebe3`
// do backend). A leitura é de quem está na sessão: não muda a dos outros nem
// o estado do alerta.
import { apiGet, apiPath, apiPost } from './apiClient.js';

export function listNotifications(query = {}) {
  return apiGet('/notifications', query);
}

export function countUnreadNotifications() {
  return apiGet('/notifications/unread-count');
}

export function readNotification(notificationId) {
  return apiPost(apiPath`/notifications/${notificationId}/read`);
}

/** Todas as não lidas, ou só as de um paciente (`{ patientId }`). */
export function readAllNotifications(body = {}) {
  return apiPost('/notifications/read-all', body);
}

// Painel operacional pelas rotas `dashboard` da API (manual `dashboard-*.md`,
// conferido em 24/11/2026 no commit `3beebe3` do backend). A API confere a
// permissão e o plano, conta os dados da organização da sessão e manda a
// mensagem do período sem registro.
import { apiGet } from './apiClient.js';

export const DASHBOARD_ERROR_CODES = Object.freeze({
  PLAN_UNAVAILABLE: 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE',
});

/** Resumo do painel no período `{ from, to }`. */
export function getDashboard(period = {}) {
  return apiGet('/dashboard', period);
}

export function getDashboardPatients(period = {}) {
  return apiGet('/dashboard/patients', period);
}

/** Usuários não dependem do período: a API conta a situação atual. */
export function getDashboardUsers() {
  return apiGet('/dashboard/users');
}

export function getDashboardFollowUps(period = {}) {
  return apiGet('/dashboard/follow-ups', period);
}

export function getDashboardAlerts(period = {}) {
  return apiGet('/dashboard/alerts', period);
}

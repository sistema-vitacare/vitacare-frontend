// Relatórios gerenciais pelas rotas `management-reports` da API (manual
// `management-reports-*.md`, conferido em 24/11/2026 no commit `3beebe3` do
// backend). A API confere a permissão e o plano, monta os relatórios, conta
// as exportações ("N gerados") e lista as recentes.
import { apiDownload, apiGet } from './apiClient.js';

export function listManagementReports() {
  return apiGet('/management-reports');
}

export function listRecentReports(query = {}) {
  return apiGet('/management-reports/recent', query);
}

/** Alertas e intercorrências no período, com a condição opcional. */
export function getAlertsReport(query = {}) {
  return apiGet('/management-reports/alerts', query);
}

export function exportAlertsReportPdf(query = {}) {
  return apiDownload('/management-reports/alerts/pdf', query);
}

/** Atividade dos cuidadores no período, com a condição opcional. */
export function getCaregiversReport(query = {}) {
  return apiGet('/management-reports/caregivers', query);
}

export function exportCaregiversReportPdf(query = {}) {
  return apiDownload('/management-reports/caregivers/pdf', query);
}

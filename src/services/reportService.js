// Relatório do paciente pelas rotas `patients/{patientId}/report` da API
// (manual `patients-relatorio.md` e `patients-relatorio-pdf.md`, conferido em
// 24/11/2026 no commit `3beebe3` do backend). A API confere o alcance, monta
// o relatório, grava a exportação na auditoria e dá o nome do PDF.
import { apiDownload, apiGet, apiPath } from './apiClient.js';

/** Relatório do período `{ from, to }`. */
export function getPatientReport(patientId, period = {}) {
  return apiGet(apiPath`/patients/${patientId}/report`, period);
}

/** PDF do mesmo relatório, com o nome do `Content-Disposition`. */
export function exportPatientReportPdf(patientId, period = {}) {
  return apiDownload(apiPath`/patients/${patientId}/report/pdf`, period);
}

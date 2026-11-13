// Relatório do paciente simulado, no formato de GET /patients/{id}/report e
// /report/pdf (manual `patients-relatorio*.md`, conferido em 12/11/2026). O
// relatório é montado na hora e nada fica guardado; o PDF simulado tem uma
// página fixa, e o real é gerado pela API. A exportação é auditada, como na
// API, e entra nos relatórios recentes; a leitura em JSON não. Na
// integração, as duas funções passam a chamar as rotas, e a tela salva o
// arquivo do mesmo jeito.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { reportPdfLines } from '../data/mocks/reportPdf.js';
import { formatDate, TIME_ZONE, todayInSaoPaulo } from '../utils/format.js';
import { resolvePeriod } from '../utils/period.js';
import { placeholderPdf } from '../utils/placeholderPdf.js';
import { recordExport } from './auditStore.js';
import { currentViewer } from './authService.js';
import { allMedications, medicationView } from './medicationStore.js';
import {
  ApiError,
  mockRequest,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { findOrganization } from './organizationStore.js';
import { evolutionSeries, followUpsInPeriod } from './patientService.js';
import { reachablePatient } from './patientStore.js';

const MAX_RECORDS = 1000;

/** Conferências na ordem da API: sessão, permissão, período e paciente. */
function access(patientId, query, now) {
  const viewer = currentViewer();
  requirePermission(viewer, P.REPORTS_GENERATE);
  const { period, errors } = resolvePeriod(query, todayInSaoPaulo(now));
  if (errors.length > 0) {
    throw validationError(errors);
  }
  const patient = reachablePatient(viewer, patientId);
  const records = followUpsInPeriod(patientId, period, now);
  if (records.length > MAX_RECORDS) {
    throw new ApiError({
      status: 422,
      code: 'REPORT_TOO_MANY_RECORDS',
      message:
        'O período tem registros demais para um relatório. Escolha um período menor.',
    });
  }
  return { viewer, patient, period, records };
}

function totalsBy(items, keyOf) {
  const totals = new Map();
  for (const item of items) {
    const [id, name] = keyOf(item);
    const entry = totals.get(id) ?? { id, name, total: 0 };
    entry.total += 1;
    totals.set(id, entry);
  }
  return [...totals.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

export function getPatientReport(patientId, query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { viewer, patient, period, records } = access(patientId, query, now);
    const items = [...records].sort(
      (a, b) =>
        a.visitedAt.localeCompare(b.visitedAt) ||
        a.submittedAt.localeCompare(b.submittedAt),
    );
    return respond({
      generatedAt: now.toISOString(),
      generatedBy: { id: viewer.user.id, name: viewer.user.name },
      organization: {
        name: findOrganization(viewer.organization.id).tradeName,
      },
      period: { ...period, timeZone: TIME_ZONE },
      // Sem CPF, contato, endereço, plano de saúde e observações, como a API.
      patient: {
        id: patient.id,
        name: patient.name,
        birthDate: patient.birthDate,
        sex: patient.sex,
        status: patient.status,
        mainCondition: patient.mainCondition,
        secondaryConditions: patient.secondaryConditions,
        responsible: patient.responsible
          ? { id: patient.responsible.id, name: patient.responsible.name }
          : null,
      },
      records: {
        total: items.length,
        firstVisitedAt: items[0]?.visitedAt ?? null,
        lastVisitedAt: items.at(-1)?.visitedAt ?? null,
        byForm: totalsBy(items, (item) => [item.form.id, item.form.name]).map(
          ({ id, name, total }) => ({ formId: id, formName: name, total }),
        ),
        byAuthor: totalsBy(items, (item) => [
          item.author.id,
          item.author.name,
        ]).map(({ id, name, total }) => ({ userId: id, name, total })),
        items,
      },
      series: evolutionSeries(records),
      medications: allMedications()
        .filter(
          (item) => item.patientId === patientId && item.status === 'active',
        )
        .map((item) => medicationView(item, now)),
    });
  });
}

/** Arquivo e nome do `Content-Disposition` da API, que leva só o período. */
export function exportPatientReportPdf(patientId, query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { viewer, patient, period } = access(patientId, query, now);
    recordExport({
      viewer,
      action: 'patient_report.exported',
      entity: { type: 'patient', id: patient.id, label: patient.name },
      afterValues: { from: period.from, to: period.to },
    });
    const bytes = placeholderPdf(
      reportPdfLines({
        patientName: patient.name,
        from: formatDate(period.from),
        to: formatDate(period.to),
      }),
    );
    return respond({
      blob: new Blob([bytes], { type: 'application/pdf' }),
      fileName: `relatorio-paciente-${period.from}-a-${period.to}.pdf`,
    });
  });
}

// Relatórios gerenciais simulados, no formato das rotas `management-reports`
// (manual `management-reports-*.md`, conferido em 13/11/2026, BE-30). Os
// relatórios são calculados a partir dos estados existentes; o catálogo e os
// recentes saem das exportações auditadas, simuladas e feitas na sessão. Na
// integração, cada função passa a chamar a rota.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { MANAGEMENT_REPORTS_FEATURE } from '../constants/plans.js';
import { auditEventsAsOf } from '../data/mocks/auditEvents.js';
import { managementReportPdfLines } from '../data/mocks/reportPdf.js';
import { formatDate, TIME_ZONE, todayInSaoPaulo } from '../utils/format.js';
import { alertsReport, caregiversReport } from '../utils/managementReports.js';
import { resolvePeriod } from '../utils/period.js';
import { placeholderPdf } from '../utils/placeholderPdf.js';
import { allAlerts } from './alertStore.js';
import { recordExport, sessionAuditEvents } from './auditStore.js';
import { currentViewer } from './authService.js';
import { allFollowUps } from './followUpStore.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { currentPlan, findOrganization } from './organizationStore.js';
import { allLinks, allPatients, findPatient } from './patientStore.js';
import { allUsers } from './userStore.js';

const CONDITION_MAX_LENGTH = 100;
const MAX_ALERTS = 10000;
const EXPORT_ACTIONS = [
  'patient_report.exported',
  'management_report.exported',
];

const CATALOG = [
  {
    type: 'patient_follow_up',
    name: 'Acompanhamento individual',
    description:
      'Registros, evolução com indicadores e medicamentos de um paciente (UC10).',
    path: '/patients/{patientId}/report',
    pdfPath: '/patients/{patientId}/report/pdf',
    formats: ['pdf'],
  },
  {
    type: 'alerts',
    name: 'Alertas e intercorrências',
    description:
      'Alertas emitidos no período por origem, criticidade e resolução.',
    path: '/management-reports/alerts',
    pdfPath: '/management-reports/alerts/pdf',
    formats: ['pdf'],
  },
  {
    type: 'caregiver_activity',
    name: 'Atividade dos cuidadores',
    description:
      'Vínculos, registros e alertas por cuidador no período, sem classificação de desempenho.',
    path: '/management-reports/caregivers',
    pdfPath: '/management-reports/caregivers/pdf',
    formats: ['pdf'],
  },
];

const REPORTS = {
  alerts: {
    title: 'Relatório de alertas e intercorrências',
    fileName: 'relatorio-alertas',
    emptyMessage: 'Nenhum alerta emitido no período selecionado.',
    isEmpty: (report) => report.totals.issued === 0,
    build: (input) => alertsReport(input),
  },
  caregiver_activity: {
    title: 'Relatório de atividade dos cuidadores',
    fileName: 'relatorio-atividade-cuidadores',
    emptyMessage: 'Nenhuma atividade de cuidador no período selecionado.',
    isEmpty: (report) => report.caregivers.length === 0,
    build: (input) => caregiversReport(input),
  },
};

const planFeatureUnavailable = () =>
  new ApiError({
    status: 403,
    code: 'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE',
    message:
      'Os relatórios gerenciais fazem parte do plano Enterprise. Solicite a mudança de plano para acessá-los.',
  });

function assertFeature(viewer) {
  const plan = currentPlan(viewer.organization.id);
  if (!plan?.features.includes(MANAGEMENT_REPORTS_FEATURE)) {
    throw planFeatureUnavailable();
  }
}

/** Sessão e permissão, depois o recurso do plano, como no catálogo da API. */
function viewerWithFeature() {
  const viewer = currentViewer();
  requirePermission(viewer, P.MANAGEMENT_REPORTS_GENERATE);
  assertFeature(viewer);
  return viewer;
}

function conditionOf(query) {
  if (query.condition === undefined) {
    return null;
  }
  const condition = String(query.condition).trim();
  if (condition.length === 0) {
    throw validationError([{ field: 'condition', code: 'MIN_LENGTH' }]);
  }
  if (condition.length > CONDITION_MAX_LENGTH) {
    throw validationError([{ field: 'condition', code: 'MAX_LENGTH' }]);
  }
  return condition;
}

/** Na ordem da API: permissão, query, período, plano. */
function access(query, now) {
  const viewer = currentViewer();
  requirePermission(viewer, P.MANAGEMENT_REPORTS_GENERATE);
  const condition = conditionOf(query);
  const { period, errors } = resolvePeriod(
    { from: query.from, to: query.to },
    todayInSaoPaulo(now),
  );
  if (errors.length > 0) {
    throw validationError(errors);
  }
  assertFeature(viewer);
  return { viewer, condition, period };
}

function build(type, query) {
  const now = new Date();
  const { viewer, condition, period } = access(query, now);
  const report = REPORTS[type].build({
    alerts: allAlerts(now),
    patients: allPatients(),
    users: allUsers(),
    links: allLinks(),
    followUps: allFollowUps(now),
    period,
    condition,
  });
  // O teto vale depois do filtro de condição, como na API.
  if (type === 'alerts' && report.totals.issued > MAX_ALERTS) {
    throw new ApiError({
      status: 422,
      code: 'MANAGEMENT_REPORT_TOO_MANY_ALERTS',
      message:
        'O período tem alertas demais para um relatório. Escolha um período menor ou filtre por condição.',
    });
  }
  return { viewer, condition, period, report, now };
}

function reportResponse(type, query) {
  return mockRequest(() => {
    const { viewer, condition, period, report, now } = build(type, query);
    const organization = findOrganization(viewer.organization.id);
    return respond(
      {
        period: { ...period, timeZone: TIME_ZONE },
        condition,
        generatedAt: now.toISOString(),
        organization: { id: organization.id, name: organization.tradeName },
        ...report,
      },
      REPORTS[type].isEmpty(report)
        ? { message: REPORTS[type].emptyMessage }
        : {},
    );
  });
}

/** PDF gerado na hora, com o nome do `Content-Disposition`; a exportação é auditada. */
function pdfResponse(type, query) {
  return mockRequest(() => {
    const { viewer, condition, period } = build(type, query);
    const organization = findOrganization(viewer.organization.id);
    recordExport({
      viewer,
      action: 'management_report.exported',
      entity: {
        type: 'organization',
        id: organization.id,
        label: organization.tradeName,
      },
      afterValues: {
        type,
        format: 'pdf',
        from: period.from,
        to: period.to,
        condition,
      },
    });
    const bytes = placeholderPdf(
      managementReportPdfLines({
        title: REPORTS[type].title,
        from: formatDate(period.from),
        to: formatDate(period.to),
        condition,
      }),
    );
    return respond({
      blob: new Blob([bytes], { type: 'application/pdf' }),
      fileName: `${REPORTS[type].fileName}-${period.from}-a-${period.to}.pdf`,
    });
  });
}

/** Exportações da organização, da mais recente para a mais antiga. */
function exportEvents(viewer, now) {
  return [...sessionAuditEvents(), ...auditEventsAsOf(now)]
    .filter(
      (event) =>
        event.organization.id === viewer.organization.id &&
        EXPORT_ACTIONS.includes(event.action),
    )
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id),
    );
}

const typeOf = (event) =>
  event.action === 'patient_report.exported'
    ? 'patient_follow_up'
    : event.afterValues.type;

function scopeOf(event) {
  if (event.action === 'patient_report.exported') {
    const patient = findPatient(event.entity.id);
    return {
      kind: 'patient',
      patient: patient ? { id: patient.id, name: patient.name } : null,
      condition: null,
    };
  }
  const { condition } = event.afterValues;
  return { kind: condition ? 'condition' : 'all', patient: null, condition };
}

export function listManagementReports() {
  return mockRequest(() => {
    const viewer = viewerWithFeature();
    const events = exportEvents(viewer, new Date());
    return respond(
      CATALOG.map((item) => ({
        ...item,
        exportCount: events.filter((event) => typeOf(event) === item.type)
          .length,
      })),
    );
  });
}

export function listRecentReports({ page, limit } = {}) {
  return mockRequest(() => {
    const viewer = viewerWithFeature();
    const items = exportEvents(viewer, new Date()).map((event) => ({
      id: event.id,
      type: typeOf(event),
      scope: scopeOf(event),
      period: { from: event.afterValues.from, to: event.afterValues.to },
      format: 'pdf',
      generatedBy: event.actor.user,
      generatedAt: event.occurredAt,
    }));
    const response = paginate(items, { page, limit });
    if (items.length === 0) {
      response.meta.message = 'Nenhum relatório exportado ainda.';
    }
    return response;
  });
}

export const getAlertsReport = (query = {}) => reportResponse('alerts', query);

export const exportAlertsReportPdf = (query = {}) =>
  pdfResponse('alerts', query);

export const getCaregiversReport = (query = {}) =>
  reportResponse('caregiver_activity', query);

export const exportCaregiversReportPdf = (query = {}) =>
  pdfResponse('caregiver_activity', query);

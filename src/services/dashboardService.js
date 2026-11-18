// Painel operacional simulado, no formato de GET /dashboard e dos quatro
// detalhes por indicador (manual `dashboard-*.md`, conferido em 12/11/2026).
// Os números saem dos mesmos estados que as outras telas leem, para que
// batam com eles. Na integração, cada função passa a chamar a rota.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { DASHBOARD_FEATURE } from '../constants/plans.js';
import { TENANT_PROFILES } from '../constants/users.js';
import { countByDay, isInPeriod, sortByPriority } from '../utils/dashboard.js';
import { TIME_ZONE, todayInSaoPaulo } from '../utils/format.js';
import { previousPeriod, resolvePeriod } from '../utils/period.js';
import { allAlerts } from './alertStore.js';
import { currentViewer } from './authService.js';
import { allFollowUps, findFollowUp } from './followUpStore.js';
import {
  ApiError,
  mockRequest,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { currentPlan } from './organizationStore.js';
import { allPatients } from './patientStore.js';
import { allUsers } from './userStore.js';

const LIST_LIMIT = 5;
const EMPTY_MESSAGE =
  'Nenhum registro de acompanhamento no período selecionado.';
const EMPTY_ALERTS_MESSAGE = 'Nenhum alerta emitido no período selecionado.';

const planFeatureUnavailable = () =>
  new ApiError({
    status: 403,
    code: 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE',
    message:
      'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.',
  });

/**
 * As conferências na ordem da API: sessão, permissão, período e plano.
 * Nenhuma contagem é lida antes do plano.
 */
function access(query, now) {
  const viewer = currentViewer();
  requirePermission(viewer, P.DASHBOARD_READ);
  const { period, errors } = resolvePeriod(query, todayInSaoPaulo(now));
  if (errors.length > 0) {
    throw validationError(errors);
  }
  const plan = currentPlan(viewer.organization.id);
  if (!plan?.features.includes(DASHBOARD_FEATURE)) {
    throw planFeatureUnavailable();
  }
  return { period, previous: previousPeriod(period) };
}

const withZone = (period) => ({ ...period, timeZone: TIME_ZONE });

function validFollowUps(now) {
  return allFollowUps(now).filter((item) => item.status === 'valid');
}

function followUpCounts(now, period, previous) {
  const valid = validFollowUps(now);
  const current = valid.filter((item) => isInPeriod(item.visitedAt, period));
  const before = valid.filter((item) => isInPeriod(item.visitedAt, previous));
  return {
    current,
    inPeriod: current.length,
    previousPeriodTotal: before.length,
    change: current.length - before.length,
    byDay: countByDay(
      current.map((item) => item.visitedAt),
      period,
    ),
  };
}

function alertCounts(now, period, previous) {
  const alerts = allAlerts(now);
  const issued = alerts.filter((item) => isInPeriod(item.generatedAt, period));
  const before = alerts.filter((item) =>
    isInPeriod(item.generatedAt, previous),
  );
  return {
    alerts,
    issued,
    open: alerts.filter((item) => item.status === 'open'),
    issuedInPeriod: issued.length,
    previousPeriodTotal: before.length,
    change: issued.length - before.length,
  };
}

function priorityAlert(alert, now) {
  const followUp =
    alert.source === 'reading' ? findFollowUp(alert.followUp.id, now) : null;
  return {
    id: alert.id,
    patient: alert.patient,
    source: alert.source,
    severity: alert.severity,
    title: alert.title,
    generatedAt: alert.generatedAt,
    reading:
      alert.source === 'reading'
        ? {
            fieldName: alert.field.name,
            fieldUnit: alert.field.unit,
            value: alert.value,
            operator: alert.operator,
            referenceValue: alert.referenceValue,
            author: followUp.author,
          }
        : null,
  };
}

function latestFollowUp(followUp) {
  const patient = allPatients().find((item) => item.id === followUp.patientId);
  return {
    id: followUp.id,
    patient: { id: followUp.patientId, name: patient?.name ?? '' },
    form: { id: followUp.form.id, name: followUp.form.name },
    author: followUp.author,
    visitedAt: followUp.visitedAt,
  };
}

const byVisit = (a, b) =>
  b.visitedAt.localeCompare(a.visitedAt) ||
  b.submittedAt.localeCompare(a.submittedAt);

export function getDashboard(query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { period, previous } = access(query, now);
    const patients = allPatients();
    const followUps = followUpCounts(now, period, previous);
    const alerts = alertCounts(now, period, previous);
    const data = {
      period: withZone(period),
      previousPeriod: previous,
      patients: {
        active: patients.filter((item) => item.status === 'active').length,
        newInPeriod: patients.filter((item) =>
          isInPeriod(item.createdAt, period),
        ).length,
      },
      users: {
        active: allUsers().filter((item) => item.status === 'active').length,
      },
      followUps: {
        inPeriod: followUps.inPeriod,
        previousPeriodTotal: followUps.previousPeriodTotal,
        change: followUps.change,
        byDay: followUps.byDay,
      },
      alerts: {
        issuedInPeriod: alerts.issuedInPeriod,
        previousPeriodTotal: alerts.previousPeriodTotal,
        change: alerts.change,
        pending: alerts.open.length,
      },
      priorityAlerts: sortByPriority(alerts.open)
        .slice(0, LIST_LIMIT)
        .map((alert) => priorityAlert(alert, now)),
      latestFollowUps: [...followUps.current]
        .sort(byVisit)
        .slice(0, LIST_LIMIT)
        .map(latestFollowUp),
    };
    return respond(
      data,
      followUps.inPeriod === 0 ? { message: EMPTY_MESSAGE } : {},
    );
  });
}

export function getDashboardPatients(query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { period } = access(query, now);
    const patients = allPatients();
    const active = patients.filter((item) => item.status === 'active');
    const groups = new Map();
    for (const patient of active) {
      const { responsible } = patient;
      const group = groups.get(responsible.id) ?? {
        professional: { id: responsible.id, name: responsible.name },
        active: 0,
      };
      group.active += 1;
      groups.set(responsible.id, group);
    }
    return respond({
      period: withZone(period),
      active: active.length,
      inactive: patients.length - active.length,
      newInPeriod: patients.filter((item) => isInPeriod(item.createdAt, period))
        .length,
      byResponsible: [...groups.values()].sort(
        (a, b) =>
          b.active - a.active ||
          a.professional.name.localeCompare(b.professional.name, 'pt-BR'),
      ),
    });
  });
}

export function getDashboardUsers() {
  return mockRequest(() => {
    access({}, new Date());
    const users = allUsers();
    const count = (list, status) =>
      list.filter((item) => item.status === status).length;
    return respond({
      active: count(users, 'active'),
      pending: count(users, 'pending'),
      inactive: count(users, 'inactive'),
      byProfile: TENANT_PROFILES.map((code) => {
        const members = users.filter((item) => item.profile.code === code);
        return {
          profile: {
            code,
            name: members[0]?.profile.name ?? code,
          },
          active: count(members, 'active'),
          pending: count(members, 'pending'),
          inactive: count(members, 'inactive'),
        };
      }),
    });
  });
}

function totalsBy(items, keyOf) {
  const totals = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const entry = totals.get(key.id) ?? { ...key, total: 0 };
    entry.total += 1;
    totals.set(key.id, entry);
  }
  return [...totals.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

export function getDashboardFollowUps(query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { period, previous } = access(query, now);
    const followUps = followUpCounts(now, period, previous);
    return respond(
      {
        period: withZone(period),
        previousPeriod: previous,
        inPeriod: followUps.inPeriod,
        previousPeriodTotal: followUps.previousPeriodTotal,
        change: followUps.change,
        byDay: followUps.byDay,
        byForm: totalsBy(followUps.current, (item) => item.form).map(
          ({ id, name, total }) => ({ form: { id, name }, total }),
        ),
        byAuthor: totalsBy(followUps.current, (item) => item.author).map(
          ({ id, name, total }) => ({ user: { id, name }, total }),
        ),
      },
      followUps.inPeriod === 0 ? { message: EMPTY_MESSAGE } : {},
    );
  });
}

const countKeys = (items, field, keys) =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      items.filter((item) => item[field] === key).length,
    ]),
  );

const SEVERITIES = ['critical', 'warning', 'info'];
const SOURCES = ['reading', 'absence', 'medication_reminder'];

export function getDashboardAlerts(query = {}) {
  return mockRequest(() => {
    const now = new Date();
    const { period, previous } = access(query, now);
    const alerts = alertCounts(now, period, previous);
    return respond(
      {
        period: withZone(period),
        previousPeriod: previous,
        issuedInPeriod: alerts.issuedInPeriod,
        previousPeriodTotal: alerts.previousPeriodTotal,
        change: alerts.change,
        byDay: countByDay(
          alerts.issued.map((item) => item.generatedAt),
          period,
        ),
        bySeverity: countKeys(alerts.issued, 'severity', SEVERITIES),
        bySource: countKeys(alerts.issued, 'source', SOURCES),
        issuedStillOpen: alerts.issued.filter((item) => item.status === 'open')
          .length,
        pending: {
          total: alerts.open.length,
          bySeverity: countKeys(alerts.open, 'severity', SEVERITIES),
        },
      },
      alerts.issuedInPeriod === 0 ? { message: EMPTY_ALERTS_MESSAGE } : {},
    );
  });
}

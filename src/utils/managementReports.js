// Relatórios gerenciais calculados a partir dos estados simulados, com as
// regras de `managementReport.repository.ts` do backend (BE-30, conferido em
// 13/11/2026): alertas pela data de geração e registros pela visita, no dia
// de Brasília; condição como trecho, sem diferenciar maiúsculas, na
// principal ou nas secundárias. Nenhuma linha leva nota ou posição.
import { isInPeriod } from './dashboard.js';
import { periodDays } from './period.js';
import { todayInSaoPaulo } from './format.js';

const HOUR_MS = 60 * 60 * 1000;
const MAX_INTERCURRENCES = 200;
const MAX_TOP_PATIENTS = 10;
const SEVERITIES = ['critical', 'warning', 'info'];
const SOURCE_KEYS = {
  reading: 'reading',
  absence: 'absence',
  medication_reminder: 'medicationReminder',
};

/** O paciente passa no filtro; sem condição, todos passam. */
export function matchesCondition(patient, condition) {
  if (!condition) {
    return true;
  }
  const term = condition.toLowerCase();
  return [patient.mainCondition, ...(patient.secondaryConditions ?? [])].some(
    (item) => item?.toLowerCase().includes(term),
  );
}

function eligibleIds(patients, condition) {
  return new Set(
    patients
      .filter((patient) => matchesCondition(patient, condition))
      .map((patient) => patient.id),
  );
}

const round3 = (value) => Math.round(value * 1000) / 1000;

const hoursToResolve = (alert) =>
  alert.resolution
    ? round3(
        (Date.parse(alert.resolution.resolvedAt) -
          Date.parse(alert.generatedAt)) /
          HOUR_MS,
      )
    : null;

function counts(items) {
  return {
    total: items.length,
    open: items.filter((item) => item.status === 'open').length,
    resolved: items.filter((item) => item.status === 'resolved').length,
  };
}

/** Média e mediana como a API: a mediana de quantidade par é a média dos dois do meio. */
function timing(items) {
  const hours = items
    .filter((item) => item.status === 'resolved')
    .map(hoursToResolve)
    .sort((a, b) => a - b);
  if (hours.length === 0) {
    return { resolved: 0, averageHours: null, medianHours: null };
  }
  const middle = Math.floor(hours.length / 2);
  const median =
    hours.length % 2 === 1
      ? hours[middle]
      : (hours[middle - 1] + hours[middle]) / 2;
  return {
    resolved: hours.length,
    averageHours: round3(
      hours.reduce((sum, value) => sum + value, 0) / hours.length,
    ),
    medianHours: round3(median),
  };
}

function subjectOf(alert) {
  if (alert.source === 'reading') {
    return alert.field?.name ?? null;
  }
  if (alert.source === 'absence') {
    return alert.absence?.form?.name ?? null;
  }
  return alert.medicationReminder?.medication?.name ?? null;
}

const byNewest = (a, b) =>
  b.generatedAt.localeCompare(a.generatedAt) || b.id.localeCompare(a.id);

function topPatients(issued, patientsById) {
  const rows = new Map();
  for (const alert of issued) {
    const row = rows.get(alert.patient.id) ?? {
      patient: patientsById.get(alert.patient.id),
      total: 0,
      intercurrences: 0,
      open: 0,
    };
    row.total += 1;
    row.intercurrences += alert.severity === 'critical' ? 1 : 0;
    row.open += alert.status === 'open' ? 1 : 0;
    rows.set(alert.patient.id, row);
  }
  return [...rows.values()]
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.intercurrences - a.intercurrences ||
        a.patient.name.localeCompare(b.patient.name, 'pt-BR') ||
        a.patient.id.localeCompare(b.patient.id),
    )
    .slice(0, MAX_TOP_PATIENTS)
    .map(({ patient, ...totals }) => ({
      patient: { id: patient.id, name: patient.name, status: patient.status },
      ...totals,
    }));
}

/** Conteúdo de GET /management-reports/alerts, sem período, condição e organização. */
export function alertsReport({ alerts, patients, period, condition }) {
  const eligible = eligibleIds(patients, condition);
  const patientsById = new Map(
    patients.map((patient) => [patient.id, patient]),
  );
  const issued = alerts.filter(
    (alert) =>
      eligible.has(alert.patient.id) && isInPeriod(alert.generatedAt, period),
  );
  const critical = issued.filter((alert) => alert.severity === 'critical');
  const days = new Map(
    periodDays(period).map((date) => [
      date,
      { date, total: 0, intercurrences: 0 },
    ]),
  );
  for (const alert of issued) {
    const day = days.get(todayInSaoPaulo(new Date(alert.generatedAt)));
    day.total += 1;
    day.intercurrences += alert.severity === 'critical' ? 1 : 0;
  }
  const bySeverity = (severity) =>
    issued.filter((alert) => alert.severity === severity);

  return {
    totals: { ...countsAsTotals(issued), intercurrences: critical.length },
    bySource: Object.fromEntries(
      Object.entries(SOURCE_KEYS).map(([source, key]) => [
        key,
        counts(issued.filter((alert) => alert.source === source)),
      ]),
    ),
    bySeverity: Object.fromEntries(
      SEVERITIES.map((severity) => [severity, counts(bySeverity(severity))]),
    ),
    resolution: {
      overall: timing(issued),
      bySeverity: Object.fromEntries(
        SEVERITIES.map((severity) => [severity, timing(bySeverity(severity))]),
      ),
    },
    topPatients: topPatients(issued, patientsById),
    byDay: [...days.values()],
    intercurrences: [...critical]
      .sort(byNewest)
      .slice(0, MAX_INTERCURRENCES)
      .map((alert) => ({
        id: alert.id,
        generatedAt: alert.generatedAt,
        source: alert.source,
        patient: alert.patient,
        subject: subjectOf(alert),
        status: alert.status,
        resolvedAt: alert.resolution?.resolvedAt ?? null,
        hoursToResolve: hoursToResolve(alert),
      })),
    intercurrencesTruncated: critical.length > MAX_INTERCURRENCES,
  };
}

function countsAsTotals(items) {
  const { total, open, resolved } = counts(items);
  return { issued: total, open, resolved };
}

// O vínculo vale em algum instante do período: criado antes do fim e não
// revogado antes do início, nos limites do dia de Brasília.
function linkedInPeriod(link, period) {
  const created = todayInSaoPaulo(new Date(link.createdAt));
  const revoked = link.revokedAt
    ? todayInSaoPaulo(new Date(link.revokedAt))
    : null;
  return created <= period.to && (revoked === null || revoked >= period.from);
}

const linkedAt = (link, instant) =>
  Date.parse(link.createdAt) <= Date.parse(instant) &&
  (!link.revokedAt || Date.parse(link.revokedAt) > Date.parse(instant));

/** Conteúdo de GET /management-reports/caregivers, sem período, condição e organização. */
export function caregiversReport({
  users,
  links,
  followUps,
  alerts,
  patients,
  period,
  condition,
}) {
  const eligible = eligibleIds(patients, condition);
  const caregiverLinks = links.filter(
    (link) =>
      link.role === 'caregiver' &&
      eligible.has(link.patientId) &&
      linkedInPeriod(link, period),
  );
  const records = followUps.filter(
    (record) =>
      eligible.has(record.patientId) && isInPeriod(record.visitedAt, period),
  );
  const absences = alerts.filter(
    (alert) =>
      alert.source === 'absence' && isInPeriod(alert.generatedAt, period),
  );
  const resolved = alerts.filter(
    (alert) =>
      alert.status === 'resolved' &&
      eligible.has(alert.patient.id) &&
      isInPeriod(alert.resolution.resolvedAt, period),
  );
  const people = new Set([
    ...caregiverLinks.map((link) => link.userId),
    ...records.map((record) => record.author.id),
  ]);

  const absenceIds = new Set();
  const rows = users
    .filter((user) => people.has(user.id))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id),
    )
    .map((user) => {
      const own = caregiverLinks.filter((link) => link.userId === user.id);
      const linked = new Set(own.map((link) => link.patientId));
      const authored = records.filter((record) => record.author.id === user.id);
      const valid = authored.filter((record) => record.status === 'valid');
      const covered = new Set(
        valid
          .map((record) => record.patientId)
          .filter((patientId) => linked.has(patientId)),
      );
      const absent = absences.filter((alert) =>
        own.some(
          (link) =>
            link.patientId === alert.patient.id &&
            linkedAt(link, alert.generatedAt),
        ),
      );
      absent.forEach((alert) => absenceIds.add(alert.id));
      return {
        caregiver: {
          id: user.id,
          name: user.name,
          status: user.status,
          profile: user.profile.code,
        },
        linkedPatients: linked.size,
        validFollowUps: valid.length,
        annulledFollowUps: authored.length - valid.length,
        patientsWithFollowUp: covered.size,
        patientsWithoutFollowUp: linked.size - covered.size,
        absenceAlerts: absent.length,
        resolvedAlerts: resolved.filter(
          (alert) => alert.resolution.resolvedBy.id === user.id,
        ).length,
      };
    });

  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  return {
    summary: {
      caregivers: rows.length,
      linkedPatients: new Set(
        caregiverLinks
          .filter((link) => people.has(link.userId))
          .map((link) => link.patientId),
      ).size,
      validFollowUps: sum('validFollowUps'),
      annulledFollowUps: sum('annulledFollowUps'),
      absenceAlerts: absenceIds.size,
      resolvedAlerts: sum('resolvedAlerts'),
    },
    caregivers: rows,
  };
}

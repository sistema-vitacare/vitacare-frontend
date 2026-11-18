// Alertas simulados, no formato de GET /alerts, nas três origens da API.
// Os de leitura não são escritos à mão: saem das regras simuladas aplicadas
// aos registros simulados, como na API, e por isso acompanham as datas
// relativas dos registros. Os lembretes saem da agenda dos medicamentos
// simulados nas últimas 24 horas. O de ausência é o do paciente que passou
// do prazo do formulário semanal. Os alertas dos registros feitos na sessão
// ficam no estado de alertas (`alertStore.js`).
import { absenceMessage, reminderMessage } from '../../utils/alertMessages.js';
import { readingAlerts } from '../../utils/alertRules.js';
import { occurrencesBetween } from '../../utils/medicationSchedule.js';
import { alertRules } from './alertRules.js';
import { VITAL_SIGNS_FORM } from './forms.js';
import { followUpsAsOf } from './followUps.js';
import { medications } from './medications.js';
import { patients } from './patients.js';

// A API avalia as regras logo depois de gravar o registro, ainda na mesma
// requisição: o alerta nasce instantes depois do envio, nunca antes dele.
const GENERATION_DELAY_MS = 2 * 1000;
// As varreduras de ausência e de lembrete rodam a cada 60 segundos.
const SWEEP_DELAY_MS = 30 * 1000;
const RESOLVED_AFTER_DAYS = 10;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const REMINDER_WINDOW_MS = DAY_MS;

const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';

const patientById = new Map(patients.map((patient) => [patient.id, patient]));
const ruleIndex = new Map(alertRules.map((rule, index) => [rule.id, index]));

// Identificador estável: o mesmo registro e a mesma regra dão sempre o
// mesmo alerta, mesmo quando outros alertas entram na lista.
function readingAlertId(followUpId, rule) {
  return `a1e70000-0000-5000-800${ruleIndex.get(rule.id)}-${followUpId.slice(-12)}`;
}

const ABSENCE_ALERT_ID = 'a1e70000-0000-5000-8009-000000000001';

const NO_SOURCE = {
  rule: null,
  followUp: null,
  field: null,
  value: null,
  operator: null,
  referenceValue: null,
  absence: null,
  medicationReminder: null,
};

/** A regra como estava no envio: inativa só depois da desativação. */
function ruleAt(rule, instant) {
  const inactive = rule.deactivatedAt && rule.deactivatedAt <= instant;
  return { ...rule, status: inactive ? 'inactive' : 'active' };
}

function readingAlertsAsOf(now) {
  return followUpsAsOf(now).flatMap((followUp) => {
    const generatedAt = new Date(
      Date.parse(followUp.submittedAt) + GENERATION_DELAY_MS,
    );
    // Registro anulado antes da avaliação não gera alerta; anulado depois,
    // continua como origem do alerta já gerado.
    if (
      followUp.annulment &&
      Date.parse(followUp.annulment.annulledAt) <= generatedAt.getTime()
    ) {
      return [];
    }
    const patient = patientById.get(followUp.patientId);
    const rules = alertRules.map((rule) => ruleAt(rule, followUp.submittedAt));
    return readingAlerts(followUp, rules, {
      patient,
      generatedAt: generatedAt.toISOString(),
      idFor: (rule) => readingAlertId(followUp.id, rule),
    }).map((alert) => {
      // Alertas de mais de 10 dias já foram resolvidos pelo responsável.
      if (now - generatedAt <= RESOLVED_AFTER_DAYS * DAY_MS) {
        return alert;
      }
      return {
        ...alert,
        status: 'resolved',
        resolution: {
          resolvedAt: new Date(
            generatedAt.getTime() + 3 * HOUR_MS,
          ).toISOString(),
          resolvedBy: {
            id: patient.responsible.id,
            name: patient.responsible.name,
          },
        },
      };
    });
  });
}

// Conta só os registros simulados: um registro novo reinicia a contagem da
// ausência, mas não apaga o alerta que já foi gerado.
function absenceAlert(now) {
  const lastVisit = followUpsAsOf(now)
    .filter(
      (followUp) =>
        followUp.patientId === BENEDITO &&
        followUp.form.id === VITAL_SIGNS_FORM.id,
    )
    .map((followUp) => followUp.visitedAt)
    .sort()
    .at(-1);
  const since = new Date(lastVisit);
  const dueAt = new Date(since.getTime() + 7 * DAY_MS);
  const patient = patientById.get(BENEDITO);
  return {
    id: ABSENCE_ALERT_ID,
    patient: { id: patient.id, name: patient.name },
    source: 'absence',
    severity: 'warning',
    status: 'open',
    title: 'Ausência de registro',
    message: absenceMessage({
      formName: VITAL_SIGNS_FORM.name,
      since: since.toISOString(),
      frequency: VITAL_SIGNS_FORM.frequency,
    }),
    ...NO_SOURCE,
    absence: {
      form: { id: VITAL_SIGNS_FORM.id, name: VITAL_SIGNS_FORM.name },
      since: since.toISOString(),
      dueAt: dueAt.toISOString(),
      frequency: VITAL_SIGNS_FORM.frequency,
    },
    generatedAt: new Date(dueAt.getTime() + SWEEP_DELAY_MS).toISOString(),
    resolution: null,
    notification: null,
  };
}

// Identificador estável por medicamento e horário programado.
function reminderAlertId(medicationIndex, scheduledAt) {
  const stamp = scheduledAt.toISOString().replace(/\D/g, '').slice(4, 12);
  return `a1e70000-0000-5000-8008-${String(medicationIndex).padStart(4, '0')}${stamp}`;
}

function reminderId(medicationIndex, time) {
  return `b1e70000-0000-5000-8008-${String(medicationIndex).padStart(4, '0')}${time.replace(':', '').padStart(8, '0')}`;
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function reminderAlerts(now) {
  const from = new Date(now.getTime() - REMINDER_WINDOW_MS);
  return medications.flatMap((medication, index) => {
    const patient = patientById.get(medication.patientId);
    // Medicamento inativo, sem lembrete ou de paciente inativo não lembra.
    if (
      medication.status !== 'active' ||
      !medication.remindersEnabled ||
      patient.status !== 'active'
    ) {
      return [];
    }
    return occurrencesBetween(medication.schedule, from, now)
      .map((scheduledAt) => ({
        scheduledAt,
        generatedAt: new Date(scheduledAt.getTime() + SWEEP_DELAY_MS),
      }))
      .filter(({ generatedAt }) => generatedAt <= now)
      .map(({ scheduledAt, generatedAt }) => ({
        id: reminderAlertId(index, scheduledAt),
        patient: { id: patient.id, name: patient.name },
        source: 'medication_reminder',
        severity: 'info',
        status: 'open',
        title: 'Lembrete de medicamento',
        message: reminderMessage({
          medicationName: medication.name,
          doseAmount: medication.doseAmount,
          doseUnit: medication.doseUnit,
          scheduledAt: scheduledAt.toISOString(),
        }),
        ...NO_SOURCE,
        medicationReminder: {
          medication: { id: medication.id, name: medication.name },
          reminderId: reminderId(index, timeFormatter.format(scheduledAt)),
          scheduledAt: scheduledAt.toISOString(),
        },
        generatedAt: generatedAt.toISOString(),
        resolution: null,
        notification: null,
      }));
  });
}

/** Alertas simulados com as datas calculadas a partir de `now`, do mais novo ao mais antigo. */
export function alertsAsOf(now) {
  return [
    ...readingAlertsAsOf(now),
    absenceAlert(now),
    ...reminderAlerts(now),
  ].sort(
    (a, b) =>
      b.generatedAt.localeCompare(a.generatedAt) || a.id.localeCompare(b.id),
  );
}

// Alertas simulados, no formato de GET /alerts. Os de leitura não são
// escritos à mão: saem das regras gerais aplicadas aos registros, como na
// API, e por isso acompanham as datas relativas dos registros e incluem os
// registros feitos na sessão. O de ausência é o do paciente que passou do
// prazo do formulário semanal.
import { patients as seedPatients } from './patients.js';
import { VITAL_SIGNS_FORM } from './forms.js';
import { followUpsAsOf } from './followUps.js';

// A API avalia as regras logo depois de gravar o registro, ainda na mesma
// requisição: o alerta nasce instantes depois do envio, nunca antes dele.
const GENERATION_DELAY_MS = 2 * 1000;
const RESOLVED_AFTER_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const ABSENCE_DELAY_MS = 60 * 1000;

// Regras gerais da organização (FE-21 traz o cadastro delas).
export const alertRules = [
  {
    id: 'eaff9c46-5810-5c0e-873c-734168440650',
    name: 'Pressão sistólica acima de 160',
    fieldKey: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
    operator: 'gt',
    referenceValue: 160,
    severity: 'critical',
  },
  {
    id: 'ece5a572-3ba3-5d55-8ac1-3668b08b22fd',
    name: 'Glicemia acima de 180',
    fieldKey: 'b8c50e7a-6b23-50a0-b493-ade44ab23371',
    operator: 'gt',
    referenceValue: 180,
    severity: 'warning',
  },
  {
    id: '89950b03-eb97-5d28-8ceb-319de48eadb1',
    name: 'Glicemia acima de 250',
    fieldKey: 'b8c50e7a-6b23-50a0-b493-ade44ab23371',
    operator: 'gt',
    referenceValue: 250,
    severity: 'critical',
  },
];

const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';

// Identificador estável: o mesmo registro e a mesma regra dão sempre o
// mesmo alerta, mesmo quando outros alertas entram na lista.
function readingAlertId(followUpId, ruleIndex) {
  return `a1e70000-0000-5000-800${ruleIndex}-${followUpId.slice(-12)}`;
}

const ABSENCE_ALERT_ID = 'a1e70000-0000-5000-8009-000000000001';

function withUnit(value, unit) {
  return unit ? `${value} ${unit}` : String(value);
}

function readingAlerts(now, followUps, patientById) {
  const alerts = [];
  for (const followUp of followUps) {
    const generatedAt = new Date(
      Date.parse(followUp.submittedAt) + GENERATION_DELAY_MS,
    );
    // Registro anulado antes da avaliação não gera alerta; anulado depois,
    // continua como origem do alerta já gerado.
    if (
      followUp.annulment &&
      Date.parse(followUp.annulment.annulledAt) <= generatedAt.getTime()
    ) {
      continue;
    }
    alertRules.forEach((rule, ruleIndex) => {
      const answer = followUp.answers.find(
        (item) => item.fieldKey === rule.fieldKey,
      );
      if (!answer || !(answer.value > rule.referenceValue)) {
        return;
      }
      // Alertas de mais de 10 dias já foram resolvidos pelo responsável.
      const resolved = now - generatedAt > RESOLVED_AFTER_DAYS * DAY_MS;
      const patient = patientById.get(followUp.patientId);
      alerts.push({
        id: readingAlertId(followUp.id, ruleIndex),
        patient: { id: patient.id, name: patient.name },
        source: 'reading',
        severity: rule.severity,
        status: resolved ? 'resolved' : 'open',
        title: rule.name,
        message: `${answer.name}: ${withUnit(answer.value, answer.unit)} (maior que ${withUnit(rule.referenceValue, answer.unit)}).`,
        rule: { id: rule.id, name: rule.name },
        followUp: {
          id: followUp.id,
          visitedAt: followUp.visitedAt,
          status: followUp.status,
        },
        field: { key: answer.fieldKey, name: answer.name, unit: answer.unit },
        value: String(answer.value),
        operator: rule.operator,
        referenceValue: rule.referenceValue,
        absence: null,
        medicationReminder: null,
        generatedAt: generatedAt.toISOString(),
        resolution: resolved
          ? {
              resolvedAt: new Date(
                generatedAt.getTime() + 3 * 60 * 60 * 1000,
              ).toISOString(),
              resolvedBy: {
                id: patient.responsible.id,
                name: patient.responsible.name,
              },
            }
          : null,
        notification: null,
      });
    });
  }
  return alerts;
}

// Conta só os registros simulados: um registro novo reinicia a contagem da
// ausência, mas não apaga o alerta que já foi gerado.
function absenceAlert(now, patientById) {
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
    message: `Sem registro de ${VITAL_SIGNS_FORM.name} há mais de uma semana.`,
    rule: null,
    followUp: null,
    field: null,
    value: null,
    operator: null,
    referenceValue: null,
    absence: {
      form: { id: VITAL_SIGNS_FORM.id, name: VITAL_SIGNS_FORM.name },
      since: since.toISOString(),
      dueAt: dueAt.toISOString(),
      frequency: VITAL_SIGNS_FORM.frequency,
    },
    medicationReminder: null,
    generatedAt: new Date(dueAt.getTime() + ABSENCE_DELAY_MS).toISOString(),
    resolution: null,
    notification: null,
  };
}

/**
 * Alertas com as datas calculadas a partir de `now`, do mais novo ao mais
 * antigo. `followUps` e `patients` trazem o estado da sessão (registros e
 * pacientes novos); sem eles, valem os simulados.
 */
export function alertsAsOf(
  now,
  followUps = followUpsAsOf(now),
  patients = seedPatients,
) {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  return [
    ...readingAlerts(now, followUps, patientById),
    absenceAlert(now, patientById),
  ].sort(
    (a, b) =>
      b.generatedAt.localeCompare(a.generatedAt) || a.id.localeCompare(b.id),
  );
}

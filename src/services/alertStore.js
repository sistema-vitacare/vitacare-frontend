// Estado simulado das regras e dos alertas, compartilhado pelos serviços de
// regras, alertas, registros e pacientes. Guarda o que a API guardaria no
// banco: regras criadas e alteradas, alertas dos registros feitos na sessão
// e resoluções. O registro novo é avaliado uma vez, quando é gravado, com as
// regras daquele momento, como a API faz logo depois do envio; por isso
// editar ou inativar uma regra não muda alerta já gerado.
import { alertRules as seedRules } from '../data/mocks/alertRules.js';
import { alertsAsOf } from '../data/mocks/alerts.js';
import { readingAlerts } from '../utils/alertRules.js';
import { findFollowUp } from './followUpStore.js';
import { registerMockState } from './mockApi.js';
import { findPatient, nextId } from './patientStore.js';

// O alerta nasce instantes depois do envio, nunca antes dele.
const GENERATION_DELAY_MS = 2 * 1000;

let createdRules = [];
let ruleChanges = new Map();
let sessionAlerts = [];
let resolutions = new Map();

registerMockState(() => {
  createdRules = [];
  ruleChanges = new Map();
  sessionAlerts = [];
  resolutions = new Map();
});

export function allAlertRules() {
  return [
    ...seedRules.map((rule) => ({ ...rule, ...ruleChanges.get(rule.id) })),
    ...createdRules,
  ];
}

export function findAlertRule(ruleId) {
  return allAlertRules().find((rule) => rule.id === ruleId) ?? null;
}

export function addAlertRule(rule) {
  createdRules = [...createdRules, rule];
}

export function changeAlertRule(ruleId, changes) {
  if (createdRules.some((rule) => rule.id === ruleId)) {
    createdRules = createdRules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...changes } : rule,
    );
    return;
  }
  ruleChanges.set(ruleId, { ...ruleChanges.get(ruleId), ...changes });
}

/** Avalia o registro recém-gravado com as regras de agora e guarda os alertas. */
export function recordFollowUpAlerts(followUp) {
  const patient = findPatient(followUp.patientId);
  const generatedAt = new Date(
    Date.parse(followUp.submittedAt) + GENERATION_DELAY_MS,
  ).toISOString();
  const alerts = readingAlerts(followUp, allAlertRules(), {
    patient,
    generatedAt,
    idFor: () => nextId('a1e80000'),
  });
  sessionAlerts = [...sessionAlerts, ...alerts];
  return alerts;
}

/**
 * Alertas simulados e os da sessão, como a API os devolve agora: o registro
 * de origem com a situação atual (anulado depois do disparo continua como
 * origem), o nome atual da regra e do paciente e a resolução.
 */
export function allAlerts(now = new Date()) {
  return [...alertsAsOf(now), ...sessionAlerts]
    .map((alert) => {
      const view = {
        ...alert,
        patient: {
          id: alert.patient.id,
          name: findPatient(alert.patient.id)?.name ?? alert.patient.name,
        },
      };
      if (alert.followUp) {
        const followUp = findFollowUp(alert.followUp.id, now);
        view.followUp = {
          ...alert.followUp,
          status: followUp?.status ?? alert.followUp.status,
        };
      }
      if (alert.rule) {
        view.rule = {
          id: alert.rule.id,
          name: findAlertRule(alert.rule.id)?.name ?? alert.rule.name,
        };
      }
      const resolution = resolutions.get(alert.id);
      return resolution ? { ...view, status: 'resolved', resolution } : view;
    })
    .sort(
      (a, b) =>
        b.generatedAt.localeCompare(a.generatedAt) || a.id.localeCompare(b.id),
    );
}

export function findAlert(alertId, now = new Date()) {
  return allAlerts(now).find((alert) => alert.id === alertId) ?? null;
}

/** A resolução vale para todos e não tem volta; quem chama confere se já houve. */
export function resolveAlert(alertId, resolution) {
  resolutions.set(alertId, resolution);
}

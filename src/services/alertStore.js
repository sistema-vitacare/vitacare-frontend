// Estado simulado das regras e dos alertas, compartilhado pelos serviços de
// regras e alertas. Guarda o que a API guardaria no banco: regras criadas e
// alteradas e resoluções. Os alertas são os dos registros simulados; o
// registro novo vai à API, que gera os alertas dele (Bloco 11), e eles só
// aparecem quando os alertas forem ligados à API (FE-58).
import { alertRules as seedRules } from '../data/mocks/alertRules.js';
import { alertsAsOf } from '../data/mocks/alerts.js';
import { findFollowUp } from './followUpStore.js';
import { registerMockState } from './mockApi.js';
import { findPatient } from './patientStore.js';

let createdRules = [];
let ruleChanges = new Map();
let resolutions = new Map();

registerMockState(() => {
  createdRules = [];
  ruleChanges = new Map();
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

/**
 * Alertas simulados como a API os devolve agora: o registro de origem com a
 * situação atual (anulado depois do disparo continua como origem), o nome
 * atual da regra e do paciente e a resolução.
 */
export function allAlerts(now = new Date()) {
  return alertsAsOf(now)
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

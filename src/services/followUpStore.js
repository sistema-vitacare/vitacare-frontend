// Estado simulado dos registros de acompanhamento, compartilhado pelos
// serviços de registros, anexos, alertas e pacientes. Guarda o que a API
// guardaria no banco (registro novo e anulação) por cima dos registros
// simulados, e deriva deles os alertas, como a avaliação das regras da API.
import { alertsAsOf } from '../data/mocks/alerts.js';
import { followUpsAsOf } from '../data/mocks/followUps.js';
import { registerMockState } from './mockApi.js';
import { allPatients } from './patientStore.js';

let createdFollowUps = [];
let annulments = new Map();

registerMockState(() => {
  createdFollowUps = [];
  annulments = new Map();
});

/** Registros simulados e os da sessão, com as anulações aplicadas. */
export function allFollowUps(now = new Date()) {
  return [...followUpsAsOf(now), ...createdFollowUps].map((followUp) =>
    annulments.has(followUp.id)
      ? {
          ...followUp,
          status: 'annulled',
          annulment: annulments.get(followUp.id),
        }
      : followUp,
  );
}

export function findFollowUp(followUpId, now = new Date()) {
  return (
    allFollowUps(now).find((followUp) => followUp.id === followUpId) ?? null
  );
}

export function addFollowUp(followUp) {
  createdFollowUps = [...createdFollowUps, followUp];
}

/** A anulação é única e irreversível; quem chama confere se já houve. */
export function annulFollowUp(followUpId, annulment) {
  annulments.set(followUpId, annulment);
}

/** Alertas derivados de todos os registros, inclusive os da sessão. */
export function allAlerts(now = new Date()) {
  return alertsAsOf(now, allFollowUps(now), allPatients());
}

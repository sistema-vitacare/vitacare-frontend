// Registros simulados que os alertas, o painel e os relatórios ainda leem,
// até os Blocos 12 e 13. As telas de registros leem a API desde o Bloco 11;
// aqui fica só a anulação, que esses serviços e os testes deles aplicam.
import { followUpsAsOf } from '../data/mocks/followUps.js';
import { registerMockState } from './mockApi.js';

let annulments = new Map();

registerMockState(() => {
  annulments = new Map();
});

/** Registros simulados, com as anulações aplicadas. */
export function allFollowUps(now = new Date()) {
  return followUpsAsOf(now).map((followUp) =>
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

/** A anulação é única e irreversível; quem chama confere se já houve. */
export function annulFollowUp(followUpId, annulment) {
  annulments.set(followUpId, annulment);
}

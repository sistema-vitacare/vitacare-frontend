// Registros simulados que os alertas ainda leem, até o Bloco 12. As telas de
// registros (Bloco 11), o painel e os relatórios (Bloco 13) leem a API; aqui
// fica só a anulação, que os alertas e os testes deles aplicam.
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

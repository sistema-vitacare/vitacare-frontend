// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { followUpsAsOf } from '../../src/data/mocks/followUps.js';
import {
  addFollowUp,
  allAlerts,
  allFollowUps,
  annulFollowUp,
  findFollowUp,
} from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

// Registro de sinais vitais com a sistólica acima da regra de 160.
function newFollowUp(id = 'f0120000-0000-5000-8000-000000000001') {
  return {
    id,
    patientId: DIRCE,
    form: {
      id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
      name: 'Sinais vitais',
      versionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
      versionNumber: 1,
    },
    author: {
      id: '828a4d5b-6754-54c6-8b60-63833149e502',
      name: 'Rosângela Prado',
    },
    visitedAt: '2026-11-10T14:50:00.000Z',
    submittedAt: '2026-11-10T14:55:00.000Z',
    notes: null,
    status: 'valid',
    annulment: null,
    answers: [
      {
        fieldId: '3c44a6a8-5472-5c65-ad6a-42a6a946740e',
        fieldKey: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
        name: 'Pressão sistólica',
        fieldType: 'number',
        unit: 'mmHg',
        section: 'Sinais vitais',
        position: 0,
        value: 172,
      },
    ],
  };
}

function annulment(annulledAt) {
  return { annulledAt, annulledBy: RAFAEL, reason: 'Valor digitado errado.' };
}

afterEach(() => {
  resetMockState();
});

describe('followUpStore', () => {
  it('sem nada feito na sessão, devolve os registros simulados', () => {
    expect(allFollowUps(NOW)).toEqual(followUpsAsOf(NOW));
  });

  it('inclui o registro feito na sessão e o encontra pelo id', () => {
    const followUp = newFollowUp();

    addFollowUp(followUp);

    expect(allFollowUps(NOW)).toHaveLength(followUpsAsOf(NOW).length + 1);
    expect(findFollowUp(followUp.id, NOW)).toEqual(followUp);
  });

  it('marca o registro anulado, com quem anulou, quando e o motivo', () => {
    const detail = annulment('2026-11-10T14:00:00.000Z');

    annulFollowUp(LAST_VITAL_SIGNS, detail);

    expect(findFollowUp(LAST_VITAL_SIGNS, NOW)).toMatchObject({
      status: 'annulled',
      annulment: detail,
    });
  });

  it('volta ao início com resetMockState', () => {
    addFollowUp(newFollowUp());
    annulFollowUp(LAST_VITAL_SIGNS, annulment('2026-11-10T14:00:00.000Z'));

    resetMockState();

    expect(allFollowUps(NOW)).toEqual(followUpsAsOf(NOW));
  });

  it('gera o alerta do registro novo cujo valor passa da regra', () => {
    const followUp = newFollowUp();
    addFollowUp(followUp);

    const generated = allAlerts(NOW).filter(
      (alert) => alert.followUp?.id === followUp.id,
    );

    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      severity: 'critical',
      status: 'open',
      value: '172',
      patient: { id: DIRCE },
    });
  });

  it('mantém o alerta do registro anulado depois de gerado, com a origem anulada', () => {
    const followUp = newFollowUp();
    addFollowUp(followUp);

    annulFollowUp(followUp.id, annulment('2026-11-10T14:58:00.000Z'));

    const generated = allAlerts(NOW).filter(
      (alert) => alert.followUp?.id === followUp.id,
    );
    expect(generated).toHaveLength(1);
    expect(generated[0].followUp.status).toBe('annulled');
  });
});

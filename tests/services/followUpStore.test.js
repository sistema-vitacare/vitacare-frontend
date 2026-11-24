// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { followUpsAsOf } from '../../src/data/mocks/followUps.js';
import {
  allFollowUps,
  annulFollowUp,
  findFollowUp,
} from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

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

  it('marca o registro anulado, com quem anulou, quando e o motivo', () => {
    const detail = annulment('2026-11-10T14:00:00.000Z');

    annulFollowUp(LAST_VITAL_SIGNS, detail);

    expect(findFollowUp(LAST_VITAL_SIGNS, NOW)).toMatchObject({
      status: 'annulled',
      annulment: detail,
    });
  });

  it('volta ao início com resetMockState', () => {
    annulFollowUp(LAST_VITAL_SIGNS, annulment('2026-11-10T14:00:00.000Z'));

    resetMockState();

    expect(allFollowUps(NOW)).toEqual(followUpsAsOf(NOW));
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { alertsAsOf } from '../../src/data/mocks/alerts.js';
import {
  allAlerts,
  changeAlertRule,
  findAlert,
  resolveAlert,
} from '../../src/services/alertStore.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const SYSTOLIC_RULE = 'eaff9c46-5810-5c0e-873c-734168440650';
const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

afterEach(() => {
  resetMockState();
});

// A geração dos alertas de um registro novo é da API desde o Bloco 11; aqui
// ficam os alertas dos registros simulados.
describe('alertStore', () => {
  it('sem nada feito na sessão, devolve os alertas simulados', () => {
    expect(allAlerts(NOW)).toEqual(alertsAsOf(NOW));
  });

  it('marca o alerta resolvido, com quem resolveu e quando, e encontra pelo id', () => {
    const open = allAlerts(NOW).find((alert) => alert.status === 'open');
    const resolution = {
      resolvedAt: '2026-11-10T14:59:00.000Z',
      resolvedBy: RAFAEL,
    };

    resolveAlert(open.id, resolution);

    expect(findAlert(open.id, NOW)).toMatchObject({
      status: 'resolved',
      resolution,
    });
  });

  it('volta ao início com resetMockState', () => {
    changeAlertRule(SYSTOLIC_RULE, { name: 'Outro nome' });
    resolveAlert(allAlerts(NOW)[0].id, {
      resolvedAt: '2026-11-10T14:59:00.000Z',
      resolvedBy: RAFAEL,
    });

    resetMockState();

    expect(allAlerts(NOW)).toEqual(alertsAsOf(NOW));
  });
});

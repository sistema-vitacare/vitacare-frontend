// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { alertsAsOf } from '../../src/data/mocks/alerts.js';
import {
  addAlertRule,
  allAlertRules,
  allAlerts,
  changeAlertRule,
  findAlert,
  recordFollowUpAlerts,
  resolveAlert,
} from '../../src/services/alertStore.js';
import {
  addFollowUp,
  annulFollowUp,
} from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const SYSTOLIC_RULE = 'eaff9c46-5810-5c0e-873c-734168440650';
const SYSTOLIC_KEY = '130f1e42-d2f0-501c-bdbc-26e7b89fefe8';
const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

// Registro de sinais vitais com a sistólica em `systolic`.
function newFollowUp({
  id = 'f0120000-0000-5000-8000-000000000001',
  systolic = 172,
  submittedAt = '2026-11-10T14:55:00.000Z',
} = {}) {
  return {
    id,
    patientId: DIRCE,
    form: {
      id: VITAL_SIGNS,
      name: 'Sinais vitais',
      versionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
      versionNumber: 1,
    },
    author: {
      id: '828a4d5b-6754-54c6-8b60-63833149e502',
      name: 'Rosângela Prado',
    },
    visitedAt: '2026-11-10T14:50:00.000Z',
    submittedAt,
    notes: null,
    status: 'valid',
    annulment: null,
    answers: [
      {
        fieldId: '3c44a6a8-5472-5c65-ad6a-42a6a946740e',
        fieldKey: SYSTOLIC_KEY,
        name: 'Pressão sistólica',
        fieldType: 'number',
        unit: 'mmHg',
        section: 'Sinais vitais',
        position: 0,
        value: systolic,
      },
    ],
  };
}

function record(followUp) {
  addFollowUp(followUp);
  return recordFollowUpAlerts(followUp);
}

function alertsOf(followUpId) {
  return allAlerts(NOW).filter((alert) => alert.followUp?.id === followUpId);
}

afterEach(() => {
  resetMockState();
});

describe('alertStore', () => {
  it('sem nada feito na sessão, devolve os alertas simulados', () => {
    expect(allAlerts(NOW)).toEqual(alertsAsOf(NOW));
  });

  it('gera o alerta do registro novo cujo valor passa da regra', () => {
    const followUp = newFollowUp();

    record(followUp);

    expect(alertsOf(followUp.id)).toEqual([
      expect.objectContaining({
        severity: 'critical',
        status: 'open',
        value: '172',
        patient: { id: DIRCE, name: 'Dirce Albuquerque Moraes' },
        rule: { id: SYSTOLIC_RULE, name: 'Pressão sistólica acima de 160' },
      }),
    ]);
  });

  it('mantém o alerta do registro anulado depois de gerado, com a origem anulada', () => {
    const followUp = newFollowUp();
    record(followUp);

    annulFollowUp(followUp.id, {
      annulledAt: '2026-11-10T14:58:00.000Z',
      annulledBy: RAFAEL,
      reason: 'Valor digitado errado.',
    });

    const generated = alertsOf(followUp.id);
    expect(generated).toHaveLength(1);
    expect(generated[0].followUp.status).toBe('annulled');
  });

  it('não muda o alerta já gerado quando a regra muda depois, mas mostra o nome atual da regra', () => {
    const followUp = newFollowUp();
    record(followUp);

    changeAlertRule(SYSTOLIC_RULE, {
      name: 'Sistólica acima de 180',
      referenceValue: 180,
    });

    expect(alertsOf(followUp.id)).toEqual([
      expect.objectContaining({
        title: 'Pressão sistólica acima de 160',
        referenceValue: 160,
        rule: { id: SYSTOLIC_RULE, name: 'Sistólica acima de 180' },
      }),
    ]);
  });

  it('avalia o registro seguinte com a regra como ela está agora', () => {
    changeAlertRule(SYSTOLIC_RULE, { status: 'inactive' });

    expect(record(newFollowUp())).toEqual([]);

    changeAlertRule(SYSTOLIC_RULE, { status: 'active', referenceValue: 170 });
    const later = newFollowUp({ id: 'f0120000-0000-5000-8000-000000000002' });

    expect(record(later)).toEqual([
      expect.objectContaining({ referenceValue: 170 }),
    ]);
  });

  it('usa a regra criada na sessão e troca as gerais do campo pela do paciente', () => {
    addAlertRule({
      ...allAlertRules()[0],
      id: 'regra-da-dirce',
      name: 'Sistólica da Dirce acima de 140',
      patient: { id: DIRCE, name: 'Dirce Albuquerque Moraes' },
      referenceValue: 140,
      severity: 'warning',
      createdAt: '2026-11-10T14:00:00.000Z',
    });

    // 172 passaria da regra geral de 160, que a regra da paciente substitui.
    const alerts = record(newFollowUp());

    expect(alerts.map((alert) => alert.rule.id)).toEqual(['regra-da-dirce']);
  });

  it('não usa a regra criada depois do envio do registro', () => {
    addAlertRule({
      ...allAlertRules()[0],
      id: 'regra-nova',
      referenceValue: 100,
      createdAt: '2026-11-10T14:56:00.000Z',
    });

    const alerts = record(newFollowUp());

    expect(alerts.map((alert) => alert.rule.id)).toEqual([SYSTOLIC_RULE]);
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
    record(newFollowUp());
    changeAlertRule(SYSTOLIC_RULE, { name: 'Outro nome' });
    resolveAlert(allAlerts(NOW)[0].id, {
      resolvedAt: '2026-11-10T14:59:00.000Z',
      resolvedBy: RAFAEL,
    });

    resetMockState();

    expect(allAlerts(NOW)).toEqual(alertsAsOf(NOW));
  });
});

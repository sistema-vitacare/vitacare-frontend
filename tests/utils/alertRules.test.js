// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  alertRuleErrors,
  matchesOperator,
  readingAlerts,
  rulesForFollowUp,
} from '../../src/utils/alertRules.js';

const FORM = 'form-1';
const SYSTOLIC = 'key-systolic';
const GLUCOSE = 'key-glucose';
const DIRCE = 'patient-dirce';
const OSVALDO = 'patient-osvaldo';

function rule(id, changes = {}) {
  return {
    id,
    name: `Regra ${id}`,
    form: { id: FORM, name: 'Sinais vitais' },
    field: { key: SYSTOLIC, name: 'Pressão sistólica', unit: 'mmHg' },
    patient: null,
    operator: 'gt',
    referenceValue: 160,
    severity: 'critical',
    status: 'active',
    createdAt: '2026-11-01T12:00:00.000Z',
    ...changes,
  };
}

function followUp(changes = {}) {
  return {
    id: 'f1',
    patientId: DIRCE,
    form: { id: FORM, name: 'Sinais vitais' },
    visitedAt: '2026-11-10T12:00:00.000Z',
    submittedAt: '2026-11-10T12:05:00.000Z',
    status: 'valid',
    answers: [
      {
        fieldKey: SYSTOLIC,
        name: 'Pressão sistólica',
        fieldType: 'number',
        unit: 'mmHg',
        value: 172,
      },
      {
        fieldKey: GLUCOSE,
        name: 'Glicemia capilar',
        fieldType: 'number',
        unit: 'mg/dL',
        value: 95,
      },
    ],
    ...changes,
  };
}

describe('matchesOperator', () => {
  it('compara o valor com a referência pelos quatro operadores, com o limite', () => {
    expect(matchesOperator('gt', 160, 160)).toBe(false);
    expect(matchesOperator('gte', 160, 160)).toBe(true);
    expect(matchesOperator('lt', 92, 92)).toBe(false);
    expect(matchesOperator('lte', 92, 92)).toBe(true);
    expect(matchesOperator('gt', 160.001, 160)).toBe(true);
    expect(matchesOperator('lt', 0, 0.5)).toBe(true);
  });
});

describe('rulesForFollowUp', () => {
  it('usa só as regras ativas do formulário respondido criadas até o envio', () => {
    const rules = [
      rule('r1'),
      rule('r2', { status: 'inactive' }),
      rule('r3', { form: { id: 'outro', name: 'Outro' } }),
      rule('r4', { createdAt: '2026-11-10T12:05:01.000Z' }),
      rule('r5', { createdAt: '2026-11-10T12:05:00.000Z' }),
    ];

    expect(rulesForFollowUp(rules, followUp()).map((item) => item.id)).toEqual([
      'r1',
      'r5',
    ]);
  });

  it('troca as gerais do campo pela regra do paciente, só para ele', () => {
    const rules = [
      rule('geral'),
      rule('glicemia', {
        field: { key: GLUCOSE, name: 'Glicemia', unit: null },
      }),
      rule('dirce', { patient: { id: DIRCE, name: 'Dirce' } }),
      rule('osvaldo', { patient: { id: OSVALDO, name: 'Osvaldo' } }),
    ];

    expect(rulesForFollowUp(rules, followUp()).map((item) => item.id)).toEqual([
      'dirce',
      'glicemia',
    ]);
    expect(
      rulesForFollowUp(rules, followUp({ patientId: OSVALDO })).map(
        (item) => item.id,
      ),
    ).toEqual(['osvaldo', 'glicemia']);
  });

  it('mantém as gerais quando a regra do paciente está inativa ou é posterior ao envio', () => {
    const rules = [
      rule('geral'),
      rule('inativa', {
        patient: { id: DIRCE, name: 'Dirce' },
        status: 'inactive',
      }),
      rule('depois', {
        patient: { id: DIRCE, name: 'Dirce' },
        createdAt: '2026-11-11T00:00:00.000Z',
      }),
    ];

    expect(rulesForFollowUp(rules, followUp()).map((item) => item.id)).toEqual([
      'geral',
    ]);
  });

  it('ordena pela posição do campo no registro e depois pela criação da regra', () => {
    const rules = [
      rule('glicemia', {
        field: { key: GLUCOSE, name: 'Glicemia', unit: null },
        createdAt: '2026-10-01T00:00:00.000Z',
      }),
      rule('nova', { createdAt: '2026-11-02T00:00:00.000Z' }),
      rule('antiga', { createdAt: '2026-10-02T00:00:00.000Z' }),
    ];

    expect(rulesForFollowUp(rules, followUp()).map((item) => item.id)).toEqual([
      'antiga',
      'nova',
      'glicemia',
    ]);
  });
});

describe('readingAlerts', () => {
  const patient = { id: DIRCE, name: 'Dirce Albuquerque Moraes' };
  const generatedAt = '2026-11-10T12:05:02.000Z';
  const idFor = (item, index) => `alerta-${index}-${item.id}`;

  it('gera um alerta por regra satisfeita, com a cópia do campo, do valor e da regra', () => {
    const alerts = readingAlerts(
      followUp(),
      [rule('r1'), rule('r2', { referenceValue: 180 })],
      { patient, generatedAt, idFor },
    );

    expect(alerts).toEqual([
      {
        id: 'alerta-0-r1',
        patient,
        source: 'reading',
        severity: 'critical',
        status: 'open',
        title: 'Regra r1',
        message: 'Pressão sistólica: 172 mmHg (maior que 160 mmHg).',
        rule: { id: 'r1', name: 'Regra r1' },
        followUp: {
          id: 'f1',
          visitedAt: '2026-11-10T12:00:00.000Z',
          status: 'valid',
        },
        field: { key: SYSTOLIC, name: 'Pressão sistólica', unit: 'mmHg' },
        value: '172',
        operator: 'gt',
        referenceValue: 160,
        absence: null,
        medicationReminder: null,
        generatedAt,
        resolution: null,
        notification: null,
      },
    ]);
  });

  it('não gera alerta sem regra ou sem resposta no campo', () => {
    expect(
      readingAlerts(followUp(), [], { patient, generatedAt, idFor }),
    ).toEqual([]);
    expect(
      readingAlerts(followUp({ answers: [] }), [rule('r1')], {
        patient,
        generatedAt,
        idFor,
      }),
    ).toEqual([]);
  });
});

describe('alertRuleErrors', () => {
  const valid = {
    formId: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
    fieldKey: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
    patientId: null,
    name: 'Pressão sistólica acima de 160',
    description: null,
    operator: 'gt',
    referenceValue: 160,
    severity: 'critical',
  };
  const fieldsOf = (body, options) =>
    alertRuleErrors(body, options).map(({ field, code }) => `${field}:${code}`);

  it('aceita a regra geral e a do paciente', () => {
    expect(alertRuleErrors(valid)).toEqual([]);
    expect(
      alertRuleErrors({
        ...valid,
        patientId: '0b639b83-76d0-570a-9017-7b6263d892cf',
      }),
    ).toEqual([]);
  });

  it('exige formulário, campo, nome, operador, referência e severidade', () => {
    expect(fieldsOf({})).toEqual([
      'formId:IS_UUID',
      'fieldKey:IS_UUID',
      'name:IS_STRING',
      'operator:IS_IN',
      'referenceValue:IS_NUMBER',
      'severity:IS_IN',
    ]);
  });

  it('aceita referência zero e negativa, com até três casas e dentro do limite', () => {
    expect(alertRuleErrors({ ...valid, referenceValue: 0 })).toEqual([]);
    expect(alertRuleErrors({ ...valid, referenceValue: -1.5 })).toEqual([]);
    expect(fieldsOf({ ...valid, referenceValue: 37.1234 })).toEqual([
      'referenceValue:HAS_MAX_DECIMALS',
    ]);
    expect(fieldsOf({ ...valid, referenceValue: 1e-7 })).toEqual([
      'referenceValue:HAS_MAX_DECIMALS',
    ]);
    expect(fieldsOf({ ...valid, referenceValue: '160' })).toEqual([
      'referenceValue:IS_NUMBER',
    ]);
    expect(fieldsOf({ ...valid, referenceValue: 1_000_000_000 })).toEqual([
      'referenceValue:MAX',
    ]);
    expect(fieldsOf({ ...valid, referenceValue: -1_000_000_000 })).toEqual([
      'referenceValue:MIN',
    ]);
  });

  it('limita nome e descrição e recusa descrição em branco', () => {
    expect(fieldsOf({ ...valid, name: 'a'.repeat(121) })).toEqual([
      'name:MAX_LENGTH',
    ]);
    expect(fieldsOf({ ...valid, description: '  ' })).toEqual([
      'description:MIN_LENGTH',
    ]);
    expect(fieldsOf({ ...valid, description: 'a'.repeat(501) })).toEqual([
      'description:MAX_LENGTH',
    ]);
  });

  it('na edição, aceita só nome, descrição, operador, referência e severidade', () => {
    const partial = { partial: true };

    expect(alertRuleErrors({ referenceValue: 150 }, partial)).toEqual([]);
    expect(alertRuleErrors({ description: null }, partial)).toEqual([]);
    expect(fieldsOf({ name: null, operator: null }, partial)).toEqual([
      'name:IS_STRING',
      'operator:IS_IN',
    ]);
    expect(fieldsOf({ fieldKey: valid.fieldKey }, partial)).toEqual([
      'fieldKey:WHITELIST_VALIDATION',
    ]);
  });
});

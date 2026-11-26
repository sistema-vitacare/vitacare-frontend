// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { alertRuleErrors } from '../../src/utils/alertRules.js';

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

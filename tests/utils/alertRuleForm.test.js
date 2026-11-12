// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createRuleBody,
  emptyRuleValues,
  monitorableFields,
  ruleValues,
  updateRuleBody,
} from '../../src/utils/alertRuleForm.js';

const FORM = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const KEY = '130f1e42-d2f0-501c-bdbc-26e7b89fefe8';

const rule = {
  id: 'r1',
  form: { id: FORM, name: 'Sinais vitais' },
  field: {
    key: KEY,
    name: 'Pressão sistólica',
    fieldType: 'number',
    unit: 'mmHg',
  },
  patient: null,
  name: 'Pressão sistólica acima de 160',
  description: null,
  operator: 'gt',
  referenceValue: 37.5,
  severity: 'critical',
};

describe('monitorableFields', () => {
  it('oferece só os campos de número e de escala da versão, na ordem dela', () => {
    const version = {
      fields: [
        { fieldKey: 'a', name: 'Pressão', fieldType: 'number' },
        { fieldKey: 'b', name: 'Banho', fieldType: 'boolean' },
        { fieldKey: 'c', name: 'Dor', fieldType: 'scale' },
        { fieldKey: 'd', name: 'Notas', fieldType: 'text' },
      ],
    };

    expect(monitorableFields(version).map((field) => field.fieldKey)).toEqual([
      'a',
      'c',
    ]);
    expect(monitorableFields(null)).toEqual([]);
  });
});

describe('valores da regra', () => {
  it('começa vazia e traz a regra gravada com vírgula decimal', () => {
    expect(emptyRuleValues()).toEqual({
      fieldKey: '',
      patientId: '',
      name: '',
      description: '',
      operator: '',
      reference: '',
      severity: '',
    });
    expect(ruleValues(rule)).toEqual({
      fieldKey: KEY,
      patientId: '',
      name: 'Pressão sistólica acima de 160',
      description: '',
      operator: 'gt',
      reference: '37,5',
      severity: 'critical',
    });
  });
});

describe('createRuleBody', () => {
  it('monta o corpo da regra geral ou do paciente, com vírgula decimal e descrição vazia como nula', () => {
    const values = {
      ...emptyRuleValues(),
      fieldKey: KEY,
      name: 'Febre',
      operator: 'gte',
      reference: '37,8',
      severity: 'warning',
      description: '  ',
    };

    expect(createRuleBody(FORM, values)).toEqual({
      formId: FORM,
      fieldKey: KEY,
      patientId: null,
      name: 'Febre',
      description: null,
      operator: 'gte',
      referenceValue: 37.8,
      severity: 'warning',
    });
    expect(createRuleBody(FORM, { ...values, patientId: 'p1' }).patientId).toBe(
      'p1',
    );
  });

  it('deixa a referência inválida como está, para a regra da API apontar o campo', () => {
    const body = createRuleBody(FORM, {
      ...emptyRuleValues(),
      reference: 'alto',
    });

    expect(Number.isNaN(body.referenceValue)).toBe(true);
    expect(
      createRuleBody(FORM, emptyRuleValues()).referenceValue,
    ).toBeUndefined();
  });
});

describe('updateRuleBody', () => {
  it('manda só nome, descrição, operador, referência e severidade alterados', () => {
    expect(
      updateRuleBody(rule, {
        ...ruleValues(rule),
        reference: '38',
        description: 'Combinado com a família.',
      }),
    ).toEqual({ referenceValue: 38, description: 'Combinado com a família.' });
  });

  it('não vê mudança no mesmo valor escrito de outro jeito', () => {
    expect(
      updateRuleBody(rule, {
        ...ruleValues(rule),
        name: ' Pressão sistólica acima de 160 ',
        reference: '37,50',
      }),
    ).toEqual({});
  });
});

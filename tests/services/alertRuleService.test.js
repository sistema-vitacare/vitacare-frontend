// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAlertRule,
  deactivateAlertRule,
  listAlertRules,
  reactivateAlertRule,
  updateAlertRule,
} from '../../src/services/alertRuleService.js';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const DAILY = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';
const WELL_BEING_DRAFT = 'fc78dd55-dd62-5075-bd49-995af47c3da7';
const TRIAGE_INACTIVE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';
const GLUCOSE = 'b8c50e7a-6b23-50a0-b493-ade44ab23371';
const PAIN = 'bd3146d6-997f-575d-abc9-c18f5108c7f1';
const ATE_WELL = 'b50fee29-a135-52f5-a4fb-3fb546368309';
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const SYSTOLIC_RULE = 'eaff9c46-5810-5c0e-873c-734168440650';
const TEMPERATURE_RULE = '7e9a1b3c-5d7f-5091-8b2c-6d8e0f2a4b6c';

const names = (response) => response.data.map((rule) => rule.name);

const newRule = {
  formId: DAILY,
  fieldKey: PAIN,
  patientId: null,
  name: '  Dor acima de 7 ',
  description: null,
  operator: 'gte',
  referenceValue: 7,
  severity: 'warning',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listAlertRules', () => {
  it('lista as regras do formulário, ativas primeiro, depois as mais novas e o id', async () => {
    await startDemoSession('professional');

    const response = await listAlertRules({ formId: VITAL_SIGNS });

    // As duas ativas têm a mesma data de criação; desempata o id.
    expect(names(response)).toEqual([
      'Saturação abaixo de 92',
      'Pressão sistólica acima de 160',
      'Temperatura acima de 37,8',
    ]);
    expect(response.data.at(-1).status).toBe('inactive');
  });

  it('filtra pelas regras próprias do paciente e pela situação', async () => {
    await startDemoSession('professional');

    expect(names(await listAlertRules({ patientId: BENEDITO }))).toEqual([
      'Saturação abaixo de 92',
    ]);
    expect(names(await listAlertRules({ status: 'inactive' }))).toEqual([
      'Temperatura acima de 37,8',
    ]);
  });

  it('só deixa ler quem configura as regras', async () => {
    await startDemoSession('caregiver');

    await expect(listAlertRules({ formId: VITAL_SIGNS })).rejects.toMatchObject(
      { status: 403 },
    );
  });
});

describe('createAlertRule', () => {
  it('cria a regra geral sobre o campo de escala, com o campo da versão vigente', async () => {
    await startDemoSession('professional');

    const { data } = await createAlertRule(newRule);

    expect(data).toMatchObject({
      form: { id: DAILY, name: 'Acompanhamento diário' },
      field: { key: PAIN, name: 'Dor', fieldType: 'scale', unit: null },
      patient: null,
      name: 'Dor acima de 7',
      operator: 'gte',
      referenceValue: 7,
      severity: 'warning',
      status: 'active',
      createdBy: { name: 'Rafael Moura Brandão' },
      createdAt: NOW.toISOString(),
      deactivatedAt: null,
    });
    expect(names(await listAlertRules({ formId: DAILY }))[0]).toBe(
      'Dor acima de 7',
    );
  });

  it('cria a regra de um paciente a que o formulário se aplica', async () => {
    await startDemoSession('admin');

    const { data } = await createAlertRule({
      ...newRule,
      fieldKey: GLUCOSE,
      patientId: DIRCE,
    });

    expect(data.patient).toEqual({
      id: DIRCE,
      name: 'Dirce Albuquerque Moraes',
    });
  });

  it('recusa formulário em rascunho, desativado ou inexistente', async () => {
    await startDemoSession('professional');

    await expect(
      createAlertRule({ ...newRule, formId: WELL_BEING_DRAFT }),
    ).rejects.toMatchObject({ status: 404, code: 'FORM_NOT_FOUND' });
    await expect(
      createAlertRule({ ...newRule, formId: TRIAGE_INACTIVE }),
    ).rejects.toMatchObject({ status: 409, code: 'ALERT_RULE_FORM_INACTIVE' });
  });

  it('recusa campo fora da versão vigente ou que não é número nem escala', async () => {
    await startDemoSession('professional');

    await expect(
      createAlertRule({
        ...newRule,
        fieldKey: '00000000-0000-5000-8000-000000000000',
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'ALERT_RULE_FIELD_NOT_FOUND',
      fields: [{ field: 'fieldKey', code: 'NOT_FOUND' }],
    });
    await expect(
      createAlertRule({ ...newRule, fieldKey: ATE_WELL }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'ALERT_RULE_FIELD_NOT_NUMERIC',
      fields: [{ field: 'fieldKey', code: 'NOT_NUMERIC' }],
    });
  });

  it('recusa paciente inativo, inexistente ou fora do público do formulário', async () => {
    await startDemoSession('professional');

    await expect(
      createAlertRule({ ...newRule, patientId: ALZIRA_INACTIVE }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ALERT_RULE_PATIENT_INACTIVE',
    });
    await expect(
      createAlertRule({
        ...newRule,
        patientId: '00000000-0000-5000-8000-000000000000',
      }),
    ).rejects.toMatchObject({ status: 404, code: 'PATIENT_NOT_FOUND' });
    await expect(
      createAlertRule({ ...newRule, patientId: CLEUSA }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'ALERT_RULE_FORM_NOT_APPLICABLE',
      fields: [{ field: 'patientId', code: 'NOT_APPLICABLE' }],
    });
  });

  it('recusa corpo inválido com 422', async () => {
    await startDemoSession('professional');

    await expect(
      createAlertRule({ ...newRule, operator: 'eq', referenceValue: '7' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [
        { field: 'operator', code: 'IS_IN' },
        { field: 'referenceValue', code: 'IS_NUMBER' },
      ],
    });
  });
});

describe('updateAlertRule', () => {
  it('muda nome, operador, referência e severidade da regra ativa', async () => {
    await startDemoSession('professional');

    const { data } = await updateAlertRule(SYSTOLIC_RULE, {
      name: 'Pressão sistólica de 170 ou mais',
      operator: 'gte',
      referenceValue: 170,
    });

    expect(data).toMatchObject({
      name: 'Pressão sistólica de 170 ou mais',
      operator: 'gte',
      referenceValue: 170,
      severity: 'critical',
      updatedAt: NOW.toISOString(),
    });
  });

  it('recusa regra inativa, inexistente e edição sem mudança', async () => {
    await startDemoSession('professional');

    await expect(
      updateAlertRule(TEMPERATURE_RULE, { referenceValue: 38 }),
    ).rejects.toMatchObject({ status: 409, code: 'ALERT_RULE_INACTIVE' });
    await expect(
      updateAlertRule('nao-existe', { referenceValue: 38 }),
    ).rejects.toMatchObject({ status: 404, code: 'ALERT_RULE_NOT_FOUND' });
    await expect(
      updateAlertRule(SYSTOLIC_RULE, { referenceValue: 160 }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'ALERT_RULE_NOTHING_TO_UPDATE',
    });
    await expect(
      updateAlertRule(SYSTOLIC_RULE, { fieldKey: GLUCOSE }),
    ).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'fieldKey', code: 'WHITELIST_VALIDATION' }],
    });
  });
});

describe('deactivateAlertRule e reactivateAlertRule', () => {
  it('inativa e reativa, com 409 ao repetir', async () => {
    await startDemoSession('professional');

    const { data: inactive } = await deactivateAlertRule(SYSTOLIC_RULE);
    expect(inactive).toMatchObject({
      status: 'inactive',
      deactivatedAt: NOW.toISOString(),
    });
    await expect(deactivateAlertRule(SYSTOLIC_RULE)).rejects.toMatchObject({
      status: 409,
      code: 'ALERT_RULE_ALREADY_INACTIVE',
    });

    const { data: active } = await reactivateAlertRule(SYSTOLIC_RULE);
    expect(active).toMatchObject({ status: 'active', deactivatedAt: null });
    await expect(reactivateAlertRule(SYSTOLIC_RULE)).rejects.toMatchObject({
      status: 409,
      code: 'ALERT_RULE_ALREADY_ACTIVE',
    });
  });
});

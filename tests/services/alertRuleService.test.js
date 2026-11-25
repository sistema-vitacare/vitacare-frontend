import { afterEach, describe, expect, it } from 'vitest';
import {
  createAlertRule,
  deactivateAlertRule,
  listAlertRules,
  reactivateAlertRule,
  updateAlertRule,
} from '../../src/services/alertRuleService.js';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import {
  SYSTOLIC,
  SYSTOLIC_RULE,
  VITAL_SIGNS,
  apiAlertRule,
} from '../support/fixtures/alertRules.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('professional').id}`;
const RULE = apiAlertRule(
  SYSTOLIC_RULE,
  VITAL_SIGNS,
  SYSTOLIC,
  'Pressão sistólica acima de 160',
);

const answer = ({ body }) => ({ data: { ...RULE, ...body }, meta: {} });

async function signIn() {
  await login(credentialsFor('professional'));
}

afterEach(() => {
  resetMockState();
});

describe('alertRuleService', () => {
  it('lista pela API com o formulário e o limite na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /alert-rules': () => apiPage([RULE]) });

    const { data } = await listAlertRules({
      formId: VITAL_SIGNS.id,
      limit: 100,
    });

    expect(data).toEqual([RULE]);
    expect(apiStub().last('GET /alert-rules')).toMatchObject({
      query: { formId: VITAL_SIGNS.id, limit: '100' },
      token: TOKEN,
    });
  });

  it('cria e edita com o corpo que a tela monta', async () => {
    await signIn();
    apiStub().use({
      'POST /alert-rules': answer,
      'PATCH /alert-rules/:ruleId': answer,
    });
    const created = {
      formId: VITAL_SIGNS.id,
      fieldKey: SYSTOLIC.key,
      patientId: null,
      name: 'Pressão sistólica acima de 160',
      operator: 'gt',
      referenceValue: 160,
      severity: 'critical',
    };

    await createAlertRule(created);
    await updateAlertRule(SYSTOLIC_RULE, { referenceValue: 170 });

    expect(apiStub().last('POST /alert-rules').body).toEqual(created);
    expect(apiStub().last('PATCH /alert-rules/:ruleId')).toMatchObject({
      params: { ruleId: SYSTOLIC_RULE },
      body: { referenceValue: 170 },
    });
  });

  it('inativa e reativa pelas rotas da regra', async () => {
    await signIn();
    apiStub().use({
      'POST /alert-rules/:ruleId/deactivate': answer,
      'POST /alert-rules/:ruleId/reactivate': answer,
    });

    await deactivateAlertRule(SYSTOLIC_RULE);
    await reactivateAlertRule(SYSTOLIC_RULE);

    expect(
      [
        'POST /alert-rules/:ruleId/deactivate',
        'POST /alert-rules/:ruleId/reactivate',
      ].map((route) => apiStub().last(route).params.ruleId),
    ).toEqual([SYSTOLIC_RULE, SYSTOLIC_RULE]);
  });

  it('devolve o erro da API com o código, como o paciente fora do público', async () => {
    await signIn();
    apiStub().use({
      'POST /alert-rules': () =>
        apiFailure(
          422,
          'ALERT_RULE_FORM_NOT_APPLICABLE',
          'O formulário não se aplica a este paciente.',
        ),
    });

    await expect(createAlertRule({})).rejects.toMatchObject({
      status: 422,
      code: 'ALERT_RULE_FORM_NOT_APPLICABLE',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await deactivateAlertRule('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe(
      '/alert-rules/..%2Fusers/deactivate',
    );
  });
});

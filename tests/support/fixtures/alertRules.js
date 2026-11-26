// Regras de alerta no formato da API (`alert-rules-listar.md`), para os
// testes da seção de regras do formulário. Nenhuma regra do backend é
// aplicada: a API filtra pelo formulário e valida os campos; o teste diz o
// que ela devolveria. Formulários, campos e pacientes são os do fixture de
// formulários.
import { apiPage } from '../apiStub.js';

export const VITAL_SIGNS = {
  id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
  name: 'Sinais vitais',
};
const DAILY = {
  id: 'd9d5ba57-125a-506d-a026-be0c9dc2dad6',
  name: 'Acompanhamento diário',
};

export const SYSTOLIC = {
  key: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
  name: 'Pressão sistólica',
  fieldType: 'number',
  unit: 'mmHg',
};
export const TEMPERATURE = {
  key: '38219edf-c13d-5e6a-9cd9-9fd2dfc59a10',
  name: 'Temperatura',
  fieldType: 'number',
  unit: '°C',
};
const SATURATION = {
  key: '35bf5edc-a094-5f8e-ae63-248e316efe97',
  name: 'Saturação de oxigênio',
  fieldType: 'number',
  unit: '%',
};
const GLYCEMIA = {
  key: 'b8c50e7a-6b23-50a0-b493-ade44ab23371',
  name: 'Glicemia capilar',
  fieldType: 'number',
  unit: 'mg/dL',
};

export const SYSTOLIC_RULE = 'eaff9c46-5810-5c0e-873c-734168440650';
export const SATURATION_RULE = '2d4f6a8b-1c3e-5f70-9a2b-4c6d8e0f1a3b';

const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

/** Uma regra como a API devolve, com as mudanças do teste. */
export function apiAlertRule(id, form, field, name, changes = {}) {
  return {
    id,
    form,
    field,
    patient: null,
    name,
    description: null,
    operator: 'gt',
    referenceValue: 0,
    severity: 'warning',
    status: 'active',
    createdBy: RAFAEL,
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    deactivatedAt: null,
    ...changes,
  };
}

/** As regras de Sinais vitais e do Acompanhamento diário; lista nova a cada chamada. */
export function allAlertRules() {
  return [
    apiAlertRule(
      SYSTOLIC_RULE,
      VITAL_SIGNS,
      SYSTOLIC,
      'Pressão sistólica acima de 160',
      { referenceValue: 160, severity: 'critical' },
    ),
    apiAlertRule(
      SATURATION_RULE,
      VITAL_SIGNS,
      SATURATION,
      'Saturação abaixo de 92',
      {
        patient: {
          id: 'c7c8c69f-5e5b-5334-9e76-a51461033100',
          name: 'Benedito Arruda Paiva',
        },
        description: 'Paciente com DPOC: limiar combinado com a família.',
        operator: 'lt',
        referenceValue: 92,
        severity: 'critical',
      },
    ),
    apiAlertRule(
      '7e9a1b3c-5d7f-5091-8b2c-6d8e0f2a4b6c',
      VITAL_SIGNS,
      TEMPERATURE,
      'Temperatura acima de 37,8',
      {
        referenceValue: 37.8,
        status: 'inactive',
        updatedAt: '2026-10-15T12:00:00.000Z',
        deactivatedAt: '2026-10-15T12:00:00.000Z',
      },
    ),
    apiAlertRule(
      'ece5a572-3ba3-5d55-8ac1-3668b08b22fd',
      DAILY,
      GLYCEMIA,
      'Glicemia acima de 180',
      { referenceValue: 180 },
    ),
  ];
}

/**
 * `GET /alert-rules` com as regras do formulário pedido. A lista é lida a
 * cada requisição, então o teste que a altera vê a seção recarregar.
 */
export function alertRuleRoutes(list = allAlertRules()) {
  return {
    'GET /alert-rules': ({ query }) =>
      apiPage(
        list.filter((rule) => rule.form.id === query.formId),
        { limit: Number(query.limit) },
      ),
  };
}

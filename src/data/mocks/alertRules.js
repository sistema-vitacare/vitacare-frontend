// Regras de alerta da organização, no formato de GET /alert-rules. Os
// valores de referência são inventados para a demonstração: o sistema não
// traz limiar clínico padrão, e quem define cada um é o profissional.
// Todas foram criadas antes dos registros simulados, que têm no máximo 40
// dias, para valerem para eles.
import { DAILY_FORM, VITAL_SIGNS_FORM } from './forms.js';

const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};
const BEATRIZ = {
  id: 'd5a58f5d-395e-5548-a230-de2350de4651',
  name: 'Beatriz Okamoto',
};
const BENEDITO = {
  id: 'c7c8c69f-5e5b-5334-9e76-a51461033100',
  name: 'Benedito Arruda Paiva',
};

const CREATED_AT = '2026-08-01T12:00:00.000Z';

function fieldOf(form, name) {
  const field = form.versions.at(-1).fields.find((item) => item.name === name);
  return {
    key: field.fieldKey,
    name: field.name,
    fieldType: field.fieldType,
    unit: field.unit,
  };
}

function rule({
  id,
  form,
  fieldName,
  patient = null,
  name,
  description = null,
  operator,
  referenceValue,
  severity,
  createdBy,
  deactivatedAt = null,
}) {
  return {
    id,
    form: { id: form.id, name: form.name },
    field: fieldOf(form, fieldName),
    patient,
    name,
    description,
    operator,
    referenceValue,
    severity,
    status: deactivatedAt ? 'inactive' : 'active',
    createdBy,
    createdAt: CREATED_AT,
    updatedAt: deactivatedAt ?? CREATED_AT,
    deactivatedAt,
  };
}

// A ordem importa: o id dos alertas de leitura simulados usa a posição da
// regra nesta lista.
export const alertRules = [
  rule({
    id: 'eaff9c46-5810-5c0e-873c-734168440650',
    form: VITAL_SIGNS_FORM,
    fieldName: 'Pressão sistólica',
    name: 'Pressão sistólica acima de 160',
    operator: 'gt',
    referenceValue: 160,
    severity: 'critical',
    createdBy: RAFAEL,
  }),
  rule({
    id: 'ece5a572-3ba3-5d55-8ac1-3668b08b22fd',
    form: DAILY_FORM,
    fieldName: 'Glicemia capilar',
    name: 'Glicemia acima de 180',
    operator: 'gt',
    referenceValue: 180,
    severity: 'warning',
    createdBy: BEATRIZ,
  }),
  rule({
    id: '89950b03-eb97-5d28-8ceb-319de48eadb1',
    form: DAILY_FORM,
    fieldName: 'Glicemia capilar',
    name: 'Glicemia acima de 250',
    operator: 'gt',
    referenceValue: 250,
    severity: 'critical',
    createdBy: BEATRIZ,
  }),
  // Regra própria de um paciente, num campo sem regra geral.
  rule({
    id: '2d4f6a8b-1c3e-5f70-9a2b-4c6d8e0f1a3b',
    form: VITAL_SIGNS_FORM,
    fieldName: 'Saturação de oxigênio',
    patient: BENEDITO,
    name: 'Saturação abaixo de 92',
    description: 'Paciente com DPOC: limiar combinado com a família.',
    operator: 'lt',
    referenceValue: 92,
    severity: 'critical',
    createdBy: RAFAEL,
  }),
  rule({
    id: '7e9a1b3c-5d7f-5091-8b2c-6d8e0f2a4b6c',
    form: VITAL_SIGNS_FORM,
    fieldName: 'Temperatura',
    name: 'Temperatura acima de 37,8',
    operator: 'gt',
    referenceValue: 37.8,
    severity: 'warning',
    createdBy: RAFAEL,
    deactivatedAt: '2026-10-15T12:00:00.000Z',
  }),
];

// Valores do diálogo de regra de alerta e a conversão para o corpo de POST e
// PATCH /alert-rules. O corpo é conferido com as regras da API
// (`alertRules.js`); aqui fica a ponte entre os campos da tela e a API:
// vírgula decimal, descrição vazia como nula e, na edição, só o que mudou,
// porque a API recusa a edição sem mudança.
import { ALERT_RULE_FIELD_TYPES } from '../constants/alerts.js';
import { decimalText, parseDecimal } from './numberInput.js';

const blankToNull = (text) => (text.trim() === '' ? null : text);

/** Campos que uma regra pode monitorar: número e escala da versão vigente. */
export function monitorableFields(version) {
  return (version?.fields ?? []).filter((field) =>
    ALERT_RULE_FIELD_TYPES.includes(field.fieldType),
  );
}

export function emptyRuleValues() {
  return {
    fieldKey: '',
    patientId: '',
    name: '',
    description: '',
    operator: '',
    reference: '',
    severity: '',
  };
}

/** Diálogo com a regra gravada. */
export function ruleValues(rule) {
  return {
    fieldKey: rule.field.key,
    patientId: rule.patient?.id ?? '',
    name: rule.name,
    description: rule.description ?? '',
    operator: rule.operator,
    reference: decimalText(rule.referenceValue),
    severity: rule.severity,
  };
}

/** Corpo de POST /alert-rules; sem paciente, a regra é geral. */
export function createRuleBody(formId, values) {
  return {
    formId,
    fieldKey: values.fieldKey,
    patientId: values.patientId || null,
    name: values.name,
    description: blankToNull(values.description),
    operator: values.operator,
    referenceValue: parseDecimal(values.reference),
    severity: values.severity,
  };
}

/** Corpo de PATCH /alert-rules/{id}: só os campos que mudaram. */
export function updateRuleBody(rule, values) {
  const next = {
    name: values.name,
    description: blankToNull(values.description),
    operator: values.operator,
    referenceValue: parseDecimal(values.reference),
    severity: values.severity,
  };
  const body = {};
  for (const [field, value] of Object.entries(next)) {
    const typed = typeof value === 'string' ? value.trim() : value;
    if (typed !== rule[field]) {
      body[field] = value;
    }
  }
  return body;
}

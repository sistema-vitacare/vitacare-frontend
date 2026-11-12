// Regras de alerta simuladas, no formato das rotas `alert-rules` da API
// (manual `alert-rules-*.md`, conferido em 12/11/2026 no commit `dc0af9c`
// do backend). Só quem configura as regras as lê. Na integração, cada
// função passa a chamar a rota correspondente.
import { ALERT_RULE_FIELD_TYPES } from '../constants/alerts.js';
import { PERMISSIONS as P } from '../constants/permissions.js';
import { alertRuleErrors } from '../utils/alertRules.js';
import {
  addAlertRule,
  allAlertRules,
  changeAlertRule,
  findAlertRule,
} from './alertStore.js';
import { currentViewer } from './authService.js';
import {
  appliesTo,
  currentVersion,
  findForm,
  formNotFound,
} from './formStore.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { findPatient, nextId, patientNotFound } from './patientStore.js';

const EDITABLE = [
  'name',
  'description',
  'operator',
  'referenceValue',
  'severity',
];

function ruleError(status, code, message, fields = null) {
  return new ApiError({ status, code, message, fields });
}

function ruleNotFound() {
  return ruleError(
    404,
    'ALERT_RULE_NOT_FOUND',
    'Regra de alerta não encontrada.',
  );
}

function existingRule(ruleId) {
  const rule = findAlertRule(ruleId);
  if (!rule) {
    throw ruleNotFound();
  }
  return rule;
}

const trimmed = (text) => (typeof text === 'string' ? text.trim() : text);

function byStatusAndRecent(a, b) {
  return (
    (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
    b.createdAt.localeCompare(a.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

/** Regras da organização: ativas primeiro, depois as mais novas. */
export function listAlertRules({
  formId,
  patientId,
  status,
  page,
  limit,
} = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERT_RULES_MANAGE);
    const items = allAlertRules()
      .filter((rule) => !formId || rule.form.id === formId)
      .filter((rule) => !patientId || rule.patient?.id === patientId)
      .filter((rule) => !status || rule.status === status)
      .sort(byStatusAndRecent);
    return paginate(items, { page, limit });
  });
}

/** O campo da versão vigente que a regra pode monitorar. */
function monitoredField(form, fieldKey) {
  const field = currentVersion(form).fields.find(
    (item) => item.fieldKey === fieldKey,
  );
  if (!field) {
    throw ruleError(
      422,
      'ALERT_RULE_FIELD_NOT_FOUND',
      'O campo informado não existe na versão vigente do formulário.',
      [{ field: 'fieldKey', code: 'NOT_FOUND' }],
    );
  }
  if (!ALERT_RULE_FIELD_TYPES.includes(field.fieldType)) {
    throw ruleError(
      422,
      'ALERT_RULE_FIELD_NOT_NUMERIC',
      'Regras de alerta só valem para campos numéricos ou de escala.',
      [{ field: 'fieldKey', code: 'NOT_NUMERIC' }],
    );
  }
  return field;
}

/** Paciente ativo a que o formulário se aplica, para a regra própria dele. */
function rulePatient(form, patientId) {
  const patient = findPatient(patientId);
  if (!patient) {
    throw patientNotFound();
  }
  if (patient.status !== 'active') {
    throw ruleError(
      409,
      'ALERT_RULE_PATIENT_INACTIVE',
      'O paciente está inativo. Reative-o antes de criar regras.',
    );
  }
  if (!appliesTo(form, patient.id)) {
    throw ruleError(
      422,
      'ALERT_RULE_FORM_NOT_APPLICABLE',
      'O formulário não se aplica a este paciente.',
      [{ field: 'patientId', code: 'NOT_APPLICABLE' }],
    );
  }
  return { id: patient.id, name: patient.name };
}

/**
 * Cria a regra sobre um campo numérico ou de escala da versão vigente de um
 * formulário ativo. Vale para os registros enviados a partir de agora.
 */
export function createAlertRule(body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERT_RULES_MANAGE);
    const errors = alertRuleErrors(body);
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const form = findForm(body.formId);
    if (!form || !currentVersion(form)) {
      throw formNotFound();
    }
    if (form.status === 'inactive') {
      throw ruleError(
        409,
        'ALERT_RULE_FORM_INACTIVE',
        'O formulário está desativado. Reative-o antes de criar regras.',
      );
    }
    const field = monitoredField(form, body.fieldKey);
    const patient = body.patientId ? rulePatient(form, body.patientId) : null;
    const now = new Date().toISOString();
    const rule = {
      id: nextId('a1e90000'),
      form: { id: form.id, name: form.name },
      field: {
        key: field.fieldKey,
        name: field.name,
        fieldType: field.fieldType,
        unit: field.unit,
      },
      patient,
      name: body.name.trim(),
      description: trimmed(body.description) ?? null,
      operator: body.operator,
      referenceValue: body.referenceValue,
      severity: body.severity,
      status: 'active',
      createdBy: { id: viewer.user.id, name: viewer.user.name },
      createdAt: now,
      updatedAt: now,
      deactivatedAt: null,
    };
    addAlertRule(rule);
    return respond(rule);
  });
}

/**
 * Muda nome, descrição, operador, referência ou severidade da regra ativa.
 * Os alertas já gerados guardam a cópia do disparo e não mudam.
 */
export function updateAlertRule(ruleId, body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERT_RULES_MANAGE);
    const errors = alertRuleErrors(body, { partial: true });
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const rule = existingRule(ruleId);
    if (rule.status !== 'active') {
      throw ruleError(
        409,
        'ALERT_RULE_INACTIVE',
        'A regra está inativa. Reative-a antes de editar.',
      );
    }
    const changes = Object.fromEntries(
      EDITABLE.filter((field) => field in body && body[field] !== undefined)
        .map((field) => [field, trimmed(body[field])])
        .filter(([field, value]) => value !== rule[field]),
    );
    if (Object.keys(changes).length === 0) {
      throw ruleError(
        422,
        'ALERT_RULE_NOTHING_TO_UPDATE',
        'Nenhuma alteração informada.',
      );
    }
    changeAlertRule(rule.id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    return respond(findAlertRule(rule.id));
  });
}

/** Deixa de avaliar os próximos registros; os alertas gerados ficam. */
export function deactivateAlertRule(ruleId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERT_RULES_MANAGE);
    const rule = existingRule(ruleId);
    if (rule.status === 'inactive') {
      throw ruleError(
        409,
        'ALERT_RULE_ALREADY_INACTIVE',
        'A regra já está inativa.',
      );
    }
    const now = new Date().toISOString();
    changeAlertRule(rule.id, {
      status: 'inactive',
      deactivatedAt: now,
      updatedAt: now,
    });
    return respond(findAlertRule(rule.id));
  });
}

/** Volta a avaliar os registros a partir de agora. */
export function reactivateAlertRule(ruleId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.ALERT_RULES_MANAGE);
    const rule = existingRule(ruleId);
    if (rule.status === 'active') {
      throw ruleError(
        409,
        'ALERT_RULE_ALREADY_ACTIVE',
        'A regra não está inativa.',
      );
    }
    changeAlertRule(rule.id, {
      status: 'active',
      deactivatedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return respond(findAlertRule(rule.id));
  });
}

// Pacientes simulados, no formato das rotas `patients` da API (manual
// `patients-*.md`, conferido em 10/11/2026). Na integração, cada função
// passa a chamar a rota correspondente.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { forms } from '../data/mocks/forms.js';
import { buildIndicators } from '../utils/evolution.js';
import { TIME_ZONE, todayInSaoPaulo } from '../utils/format.js';
import { resolvePeriod } from '../utils/period.js';
import { currentViewer } from './authService.js';
import { allAlerts } from './alertStore.js';
import { allFollowUps } from './followUpStore.js';
import { allMedications, medicationView } from './medicationStore.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import {
  addPatient,
  allPatients,
  canReach,
  changePatient,
  isFamily,
  nextId,
  patientForViewer,
  reachablePatient,
} from './patientStore.js';
import { findUser } from './userStore.js';

export const PATIENT_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'PATIENT_NOT_FOUND',
  DUPLICATE_CPF: 'PATIENT_DUPLICATE_CPF',
  INVALID_RESPONSIBLE: 'PATIENT_INVALID_RESPONSIBLE',
  INACTIVE: 'PATIENT_INACTIVE',
  ALREADY_INACTIVE: 'PATIENT_ALREADY_INACTIVE',
  ALREADY_ACTIVE: 'PATIENT_ALREADY_ACTIVE',
  PLAN_LIMIT_REACHED: 'PATIENT_PLAN_LIMIT_REACHED',
  PLAN_EXPIRED: 'PATIENT_PLAN_EXPIRED',
});

const CODES = PATIENT_ERROR_CODES;
const OVERVIEW_VALUES = 5;
const OVERVIEW_MEDICATIONS = 10;
const OVERVIEW_ALERTS = 5;
const NUMERIC_TYPES = ['number', 'scale'];

const conflict = (code, message, fields = null) =>
  new ApiError({ status: 409, code, message, fields });

function byName(a, b) {
  return a.name.localeCompare(b.name, 'pt-BR');
}

function matchesSearch(patient, search, family) {
  const term = search.trim().toLowerCase();
  if (patient.name.toLowerCase().includes(term)) {
    return true;
  }
  // Busca só com dígitos e pontuação também procura no CPF, menos para o
  // familiar, que não vê o CPF.
  const digits = term.replace(/\D/g, '');
  return (
    !family &&
    /^[\d.\-\s]+$/.test(term) &&
    digits !== '' &&
    (patient.cpf ?? '').includes(digits)
  );
}

function matchesCondition(patient, condition) {
  const term = condition.trim().toLowerCase();
  return [patient.mainCondition, ...patient.secondaryConditions].some(
    (item) => item && item.toLowerCase().includes(term),
  );
}

export function listPatients(query = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENTS_READ);
    const { status = 'active', search, condition, page, limit } = query;
    const family = isFamily(viewer);
    const items = allPatients()
      .filter((patient) => patient.status === status)
      .filter((patient) => canReach(viewer, patient.id))
      .filter((patient) => !search || matchesSearch(patient, search, family))
      .filter((patient) => !condition || matchesCondition(patient, condition))
      .sort(byName)
      .map((patient) => patientForViewer(patient, viewer, { listing: true }));
    return paginate(items, { page, limit });
  });
}

export function getPatient(patientId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENTS_READ);
    return respond(
      patientForViewer(reachablePatient(viewer, patientId), viewer),
    );
  });
}

function responsibleFor(userId) {
  const user = findUser(userId);
  const valid =
    user &&
    ['professional', 'admin'].includes(user.profile.code) &&
    ['active', 'pending'].includes(user.status);
  if (!valid) {
    throw new ApiError({
      status: 422,
      code: CODES.INVALID_RESPONSIBLE,
      message: 'O responsável precisa ser profissional ou administrador ativo.',
      fields: [{ field: 'responsibleUserId', code: 'INVALID_RESPONSIBLE' }],
    });
  }
  return { id: user.id, name: user.name, status: user.status };
}

function assertRequired(payload) {
  const missing = ['name', 'birthDate', 'responsibleUserId'].filter(
    (field) => !payload[field],
  );
  if (missing.length > 0) {
    throw validationError(
      missing.map((field) => ({ field, code: 'IS_NOT_EMPTY' })),
    );
  }
}

// O CPF é único na organização, inclusive entre pacientes inativos.
function assertUniqueCpf(cpf, ownId = null) {
  const taken =
    cpf &&
    allPatients().some(
      (patient) => patient.cpf === cpf && patient.id !== ownId,
    );
  if (taken) {
    throw conflict(
      CODES.DUPLICATE_CPF,
      'Já existe um paciente com este CPF na organização.',
      [{ field: 'cpf', code: 'DUPLICATE' }],
    );
  }
}

const EMPTY_ADDRESS = {
  zipCode: null,
  street: null,
  number: null,
  complement: null,
  district: null,
  city: null,
  state: null,
};

function patientFields(payload) {
  return {
    name: payload.name,
    birthDate: payload.birthDate,
    sex: payload.sex ?? null,
    cpf: payload.cpf ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    address: { ...EMPTY_ADDRESS, ...payload.address },
    mainCondition: payload.mainCondition ?? null,
    secondaryConditions: payload.secondaryConditions ?? [],
    healthPlan: payload.healthPlan ?? null,
    notes: payload.notes ?? null,
  };
}

export function createPatient(payload) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENTS_CREATE);
    assertRequired(payload);
    const responsible = responsibleFor(payload.responsibleUserId);
    assertUniqueCpf(payload.cpf);
    const now = new Date().toISOString();
    const patient = {
      id: nextId('9a710000'),
      ...patientFields(payload),
      status: 'active',
      responsible,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    addPatient(patient);
    return respond(patientForViewer(patient, viewer));
  });
}

export function updatePatient(patientId, payload) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENTS_UPDATE);
    const patient = reachablePatient(viewer, patientId);
    if (patient.status === 'inactive') {
      throw conflict(CODES.INACTIVE, 'O paciente está inativo.');
    }
    assertRequired(payload);
    const responsible = responsibleFor(payload.responsibleUserId);
    assertUniqueCpf(payload.cpf, patientId);
    const changes = {
      ...patientFields(payload),
      responsible,
      updatedAt: new Date().toISOString(),
    };
    changePatient(patientId, changes);
    return respond(patientForViewer({ ...patient, ...changes }, viewer));
  });
}

function changeStatus(patientId, target) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENTS_DEACTIVATE);
    const patient = reachablePatient(viewer, patientId);
    if (patient.status === target) {
      throw target === 'inactive'
        ? conflict(CODES.ALREADY_INACTIVE, 'O paciente já está inativo.')
        : conflict(CODES.ALREADY_ACTIVE, 'O paciente não está inativo.');
    }
    const now = new Date().toISOString();
    // Exclusão lógica: o cadastro e o histórico ficam; só a situação muda.
    const changes = {
      status: target,
      deletedAt: target === 'inactive' ? now : null,
      updatedAt: now,
    };
    changePatient(patientId, changes);
    return respond(patientForViewer({ ...patient, ...changes }, viewer));
  });
}

export function deactivatePatient(patientId) {
  return changeStatus(patientId, 'inactive');
}

export function reactivatePatient(patientId) {
  return changeStatus(patientId, 'active');
}

function validFollowUps(patientId, now) {
  return allFollowUps(now).filter(
    (followUp) =>
      followUp.patientId === patientId && followUp.status === 'valid',
  );
}

/** Agrupa as respostas numéricas por campo, com os pontos em ordem de visita. */
function numericSeries(followUps) {
  const groups = new Map();
  const positions = new Map();
  const ascending = [...followUps].sort((a, b) =>
    a.visitedAt.localeCompare(b.visitedAt),
  );
  for (const followUp of ascending) {
    for (const answer of followUp.answers) {
      if (!NUMERIC_TYPES.includes(answer.fieldType)) {
        continue;
      }
      const group = groups.get(answer.fieldKey) ?? { points: [] };
      group.points.push({
        value: answer.value,
        visitedAt: followUp.visitedAt,
        followUpId: followUp.id,
      });
      // Nome, unidade e seção vêm da versão do valor mais recente.
      Object.assign(group, {
        fieldKey: answer.fieldKey,
        name: answer.name,
        fieldType: answer.fieldType,
        unit: answer.unit,
        section: answer.section,
        form: { id: followUp.form.id, name: followUp.form.name },
      });
      groups.set(answer.fieldKey, group);
      positions.set(answer.fieldKey, answer.position);
    }
  }
  // Ordem da API: nome do formulário, posição do campo e `fieldKey`.
  return [...groups.values()].sort(
    (a, b) =>
      a.form.name.localeCompare(b.form.name, 'pt-BR') ||
      positions.get(a.fieldKey) - positions.get(b.fieldKey) ||
      a.fieldKey.localeCompare(b.fieldKey),
  );
}

export function getPatientOverview(patientId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_HISTORY_READ);
    reachablePatient(viewer, patientId);
    const now = new Date();
    const followUps = validFollowUps(patientId, now);
    const measurements = numericSeries(followUps).map(
      ({ points, ...field }) => ({
        ...field,
        values: points.slice(-OVERVIEW_VALUES).reverse(),
      }),
    );
    const canSeeMedications = viewer.permissions.includes(P.MEDICATIONS_READ);
    const canSeeAlerts = viewer.permissions.includes(P.ALERTS_READ);
    const active = allMedications()
      .filter(
        (item) => item.patientId === patientId && item.status === 'active',
      )
      .sort(byName)
      .map((item) => medicationView(item, now));
    const alerts = allAlerts(now).filter(
      (alert) => alert.patient.id === patientId,
    );
    const lastVisitedAt =
      followUps
        .map((followUp) => followUp.visitedAt)
        .sort()
        .at(-1) ?? null;
    return respond({
      patientId,
      counts: {
        validFollowUps: followUps.length,
        openAlerts: canSeeAlerts
          ? alerts.filter((alert) => alert.status === 'open').length
          : null,
        activeMedications: canSeeMedications ? active.length : null,
      },
      lastVisitedAt,
      measurements,
      activeMedications: canSeeMedications
        ? active.slice(0, OVERVIEW_MEDICATIONS)
        : null,
      recentAlerts: canSeeAlerts ? alerts.slice(0, OVERVIEW_ALERTS) : null,
    });
  });
}

// Faixa de escala vem da definição do campo nas versões publicadas; com a
// mesma chave em várias versões, vale a mais nova.
const fieldDefinitions = new Map(
  forms.flatMap((form) =>
    form.versions.flatMap((version) =>
      version.fields.map((field) => [field.fieldKey, field]),
    ),
  ),
);

/** Registros válidos do paciente com visita no período, em dias de Brasília. */
export function followUpsInPeriod(patientId, { from, to }, now = new Date()) {
  return validFollowUps(patientId, now).filter((followUp) => {
    const day = todayInSaoPaulo(new Date(followUp.visitedAt));
    return day >= from && day <= to;
  });
}

/**
 * Séries numéricas com os indicadores, iguais em GET /patients/{id}/evolution
 * e no relatório do paciente, que a API calcula pelas mesmas funções.
 */
export function evolutionSeries(followUps) {
  return numericSeries(followUps).map((item) => {
    const definition = fieldDefinitions.get(item.fieldKey);
    return {
      ...item,
      scaleMin: definition?.scaleMin ?? null,
      scaleMax: definition?.scaleMax ?? null,
      indicators: buildIndicators(item.points),
    };
  });
}

export function getPatientEvolution(patientId, query = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_EVOLUTION_READ);
    reachablePatient(viewer, patientId);
    const now = new Date();
    // Sem datas, os últimos 30 dias até hoje, contados no fuso de Brasília.
    const { period, errors } = resolvePeriod(query, todayInSaoPaulo(now));
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const inPeriod = followUpsInPeriod(patientId, period, now).filter(
      (followUp) => !query.formId || followUp.form.id === query.formId,
    );
    const series = evolutionSeries(inPeriod).filter(
      (item) => !query.fieldKey || item.fieldKey === query.fieldKey,
    );
    return respond({
      patientId,
      period: { ...period, timeZone: TIME_ZONE },
      series,
    });
  });
}

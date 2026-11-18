// Medicamentos simulados, no formato das rotas `medications` da API (manual
// `medications-*.md`, conferido em 12/11/2026 no commit `dc0af9c` do
// backend). Na integração, cada função passa a chamar a rota
// correspondente.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { todayInSaoPaulo } from '../utils/format.js';
import { medicationErrors } from '../utils/medicationFields.js';
import { currentViewer } from './authService.js';
import {
  addMedication,
  allMedications,
  changeMedication,
  findMedication,
  medicationView,
} from './medicationStore.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import {
  canReach,
  findPatient,
  nextId,
  reachablePatient,
} from './patientStore.js';

const SCHEDULE_FIELDS = ['startDate', 'endDate', 'intervalDays', 'times'];

function conflict(code, message) {
  return new ApiError({ status: 409, code, message });
}

const patientInactive = () =>
  conflict(
    'MEDICATION_PATIENT_INACTIVE',
    'O paciente está inativo. Reative-o antes de cadastrar ou alterar medicamentos.',
  );

function medicationNotFound() {
  return new ApiError({
    status: 404,
    code: 'MEDICATION_NOT_FOUND',
    message: 'Medicamento não encontrado.',
  });
}

/** Medicamento de paciente ao alcance; fora dele, `404` igual ao inexistente. */
function reachableMedication(viewer, medicationId) {
  const medication = findMedication(medicationId);
  if (!medication || !canReach(viewer, medication.patientId)) {
    throw medicationNotFound();
  }
  return medication;
}

const trimmed = (text) => (typeof text === 'string' ? text.trim() : text);

const sortedTimes = (times) => times.map((time) => time.trim()).sort();

function byStatusAndName(a, b) {
  return (
    (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
    a.name.localeCompare(b.name, 'pt-BR') ||
    a.id.localeCompare(b.id)
  );
}

/** Medicamentos do paciente: ativos primeiro, depois por nome. */
export function listMedications({ patientId, status, page, limit } = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.MEDICATIONS_READ);
    if (!patientId) {
      throw validationError([{ field: 'patientId', code: 'IS_UUID' }]);
    }
    reachablePatient(viewer, patientId);
    const now = new Date();
    const items = allMedications()
      .filter((medication) => medication.patientId === patientId)
      .filter((medication) => !status || medication.status === status)
      .sort(byStatusAndName)
      .map((medication) => medicationView(medication, now));
    return paginate(items, { page, limit });
  });
}

/**
 * Cadastra o medicamento e programa a agenda. O horário coincidente com
 * outro medicamento ativo do paciente volta como aviso; o cadastro já está
 * gravado.
 */
export function createMedication(body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.MEDICATIONS_CREATE);
    const now = new Date();
    const today = todayInSaoPaulo(now);
    const errors = medicationErrors(body, { today });
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const patient = reachablePatient(viewer, body.patientId);
    if (patient.status !== 'active') {
      throw patientInactive();
    }
    const medication = {
      id: nextId('a7e40000'),
      patientId: patient.id,
      name: body.name.trim(),
      doseAmount: body.doseAmount,
      doseUnit: body.doseUnit,
      route: body.route ?? null,
      notes: trimmed(body.notes) ?? null,
      schedule: {
        startDate: body.startDate ?? today,
        endDate: body.endDate ?? null,
        intervalDays: body.intervalDays ?? 1,
        times: sortedTimes(body.times),
        timeZone: 'America/Sao_Paulo',
      },
      remindersEnabled: body.remindersEnabled ?? false,
      nextScheduledAt: null,
      scheduleConflicts: [],
      status: 'active',
      createdBy: { id: viewer.user.id, name: viewer.user.name },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deactivatedAt: null,
    };
    addMedication(medication);
    return respond(medicationView(medication, now));
  });
}

/** O que a edição muda no medicamento gravado; vazio quando nada muda. */
function changesFrom(medication, body) {
  const changes = {};
  for (const field of ['name', 'doseAmount', 'doseUnit', 'route', 'notes']) {
    if (field in body && body[field] !== undefined) {
      const value = trimmed(body[field]);
      if (value !== medication[field]) {
        changes[field] = value;
      }
    }
  }
  const schedule = { ...medication.schedule };
  for (const field of SCHEDULE_FIELDS) {
    if (field in body && body[field] !== undefined) {
      schedule[field] =
        field === 'times' ? sortedTimes(body[field]) : body[field];
    }
  }
  const scheduleChanged = SCHEDULE_FIELDS.some((field) =>
    field === 'times'
      ? schedule.times.join() !== medication.schedule.times.join()
      : schedule[field] !== medication.schedule[field],
  );
  if (scheduleChanged) {
    changes.schedule = schedule;
  }
  if (
    'remindersEnabled' in body &&
    body.remindersEnabled !== undefined &&
    body.remindersEnabled !== medication.remindersEnabled
  ) {
    changes.remindersEnabled = body.remindersEnabled;
  }
  return changes;
}

/**
 * Edita o medicamento ativo de paciente ativo. Mudar a agenda ou os
 * lembretes reprograma a agenda; mudar só nome, dose, via ou observação não.
 */
export function updateMedication(medicationId, body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.MEDICATIONS_UPDATE);
    const now = new Date();
    const errors = medicationErrors(body, {
      today: todayInSaoPaulo(now),
      partial: true,
    });
    if (errors.length > 0) {
      throw validationError(errors);
    }
    const medication = reachableMedication(viewer, medicationId);
    if (medication.status !== 'active') {
      throw conflict(
        'MEDICATION_INACTIVE',
        'O medicamento está inativo. Reative-o antes de editar.',
      );
    }
    if (findPatient(medication.patientId).status !== 'active') {
      throw patientInactive();
    }
    const changes = changesFrom(medication, body);
    const schedule = changes.schedule ?? medication.schedule;
    if (schedule.endDate !== null && schedule.endDate < schedule.startDate) {
      throw new ApiError({
        status: 422,
        code: 'MEDICATION_INVALID_PERIOD',
        message: 'A data de fim não pode ser anterior à data de início.',
        fields: [{ field: 'endDate', code: 'BEFORE_START' }],
      });
    }
    if (Object.keys(changes).length === 0) {
      throw new ApiError({
        status: 422,
        code: 'MEDICATION_NOTHING_TO_UPDATE',
        message: 'Nenhuma alteração informada.',
      });
    }
    changeMedication(medication.id, {
      ...changes,
      updatedAt: now.toISOString(),
    });
    return respond(medicationView(findMedication(medication.id), now));
  });
}

/** Inativa preservando tudo; a agenda termina no mesmo instante. */
export function deactivateMedication(medicationId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.MEDICATIONS_DEACTIVATE);
    const medication = reachableMedication(viewer, medicationId);
    if (medication.status === 'inactive') {
      throw conflict(
        'MEDICATION_ALREADY_INACTIVE',
        'O medicamento já está inativo.',
      );
    }
    const now = new Date().toISOString();
    changeMedication(medication.id, {
      status: 'inactive',
      deactivatedAt: now,
      updatedAt: now,
    });
    return respond(medicationView(findMedication(medication.id)));
  });
}

/** Reativa a mesma agenda, a partir de agora; paciente inativo não reativa. */
export function reactivateMedication(medicationId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.MEDICATIONS_DEACTIVATE);
    const medication = reachableMedication(viewer, medicationId);
    if (medication.status === 'active') {
      throw conflict(
        'MEDICATION_ALREADY_ACTIVE',
        'O medicamento não está inativo.',
      );
    }
    if (findPatient(medication.patientId).status !== 'active') {
      throw patientInactive();
    }
    changeMedication(medication.id, {
      status: 'active',
      deactivatedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return respond(medicationView(findMedication(medication.id)));
  });
}

// Registros de acompanhamento simulados, no formato das rotas `follow-ups`
// da API (manual `follow-ups-*.md`, conferido em 11/11/2026 no commit
// `dc0af9c` do backend).
import { PERMISSIONS as P } from '../constants/permissions.js';
import { checkAnswers } from '../utils/followUpAnswers.js';
import { todayInSaoPaulo } from '../utils/format.js';
import { currentViewer } from './authService.js';
import {
  addFollowUp,
  allFollowUps,
  annulFollowUp as markAnnulled,
  findFollowUp,
} from './followUpStore.js';
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
import {
  canReach,
  isFamily,
  nextId,
  reachablePatient,
} from './patientStore.js';

// A API tolera relógio do celular até 5 minutos adiantado.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_NOTES_LENGTH = 2000;
const MAX_REASON_LENGTH = 500;
// Com fuso explícito (`Z` ou `±hh:mm`), como a API exige.
const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function followUpNotFound() {
  return new ApiError({
    status: 404,
    code: 'FOLLOW_UP_NOT_FOUND',
    message: 'Registro de acompanhamento não encontrado.',
  });
}

/**
 * Registro ao alcance da sessão: o do paciente que ela alcança e, para o
 * familiar, só o válido. Fora disso, `404` igual ao inexistente.
 */
export function reachableFollowUp(viewer, followUpId) {
  const followUp = findFollowUp(followUpId);
  if (
    !followUp ||
    !canReach(viewer, followUp.patientId) ||
    (isFamily(viewer) && followUp.status !== 'valid')
  ) {
    throw followUpNotFound();
  }
  return followUp;
}

/** A sessão tem alguma das permissões; sem nenhuma, `403` como o guard da API. */
export function requireAnyPermission(viewer, permissions) {
  const granted = permissions.find((permission) =>
    viewer?.permissions.includes(permission),
  );
  requirePermission(viewer, granted ?? permissions[0]);
}

/**
 * Registros de um paciente, do mais recente ao mais antigo, com filtros de
 * situação, período (dias de Brasília, inclusivos), formulário e autor.
 */
export function listFollowUps(query) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_HISTORY_READ);
    const { patientId, status, from, to, formId, authorUserId, page, limit } =
      query;
    reachablePatient(viewer, patientId);
    // O familiar nunca vê registro anulado.
    const family = isFamily(viewer);
    const items = allFollowUps(new Date())
      .filter((followUp) => followUp.patientId === patientId)
      .filter((followUp) => !family || followUp.status === 'valid')
      .filter((followUp) => !status || followUp.status === status)
      .filter((followUp) => !formId || followUp.form.id === formId)
      .filter(
        (followUp) => !authorUserId || followUp.author.id === authorUserId,
      )
      .filter((followUp) => {
        const day = todayInSaoPaulo(new Date(followUp.visitedAt));
        return (!from || day >= from) && (!to || day <= to);
      })
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    return paginate(items, { page, limit });
  });
}

export function getFollowUp(followUpId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_HISTORY_READ);
    return respond(reachableFollowUp(viewer, followUpId));
  });
}

function visitInstant(visitedAt, now) {
  if (visitedAt === undefined || visitedAt === null) {
    return now;
  }
  if (typeof visitedAt !== 'string' || !ISO_WITH_ZONE.test(visitedAt)) {
    throw validationError([{ field: 'visitedAt', code: 'IS_ISO8601' }]);
  }
  const instant = new Date(visitedAt);
  if (instant.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ApiError({
      status: 422,
      code: 'FOLLOW_UP_INVALID_VISITED_AT',
      message: 'A data da visita não pode estar no futuro.',
      fields: [{ field: 'visitedAt', code: 'IN_FUTURE' }],
    });
  }
  return instant;
}

function cleanNotes(notes) {
  if (notes === undefined || notes === null) {
    return null;
  }
  const text = typeof notes === 'string' ? notes.trim() : '';
  if (!text || text.length > MAX_NOTES_LENGTH) {
    throw validationError([
      { field: 'notes', code: text ? 'MAX_LENGTH' : 'MIN_LENGTH' },
    ]);
  }
  return text;
}

/** Versão vigente do formulário que vale para o paciente, na ordem de conferência da API. */
function answerableVersion(formId, formVersionId, patientId) {
  const form = findForm(formId);
  if (!form || form.versions.length === 0) {
    throw formNotFound();
  }
  if (form.status === 'inactive') {
    throw new ApiError({
      status: 409,
      code: 'FORM_INACTIVE',
      message: 'O formulário foi desativado e não recebe novos registros.',
    });
  }
  if (!appliesTo(form, patientId)) {
    throw new ApiError({
      status: 422,
      code: 'FOLLOW_UP_FORM_NOT_APPLICABLE',
      message: 'Este formulário não vale para o paciente.',
      fields: [{ field: 'formId', code: 'NOT_APPLICABLE' }],
    });
  }
  const version = currentVersion(form);
  // As respostas nunca são remapeadas para outra versão.
  if (version.id !== formVersionId) {
    throw new ApiError({
      status: 409,
      code: 'FOLLOW_UP_FORM_VERSION_OUTDATED',
      message: 'O formulário mudou desde que foi aberto. Abra de novo.',
      fields: [{ field: 'formVersionId', code: 'OUTDATED' }],
    });
  }
  return { form, version };
}

/**
 * Registra a visita da cuidadora: só os campos preenchidos entram, na ordem
 * da versão, com os metadados dela. Os alertas saem da avaliação das regras
 * logo depois, e a resposta não os traz.
 */
export function createFollowUp(body) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FOLLOW_UPS_CREATE);
    const now = new Date();
    const visitedAt = visitInstant(body.visitedAt, now);
    const notes = cleanNotes(body.notes);
    const patient = reachablePatient(viewer, body.patientId);
    if (patient.status !== 'active') {
      throw new ApiError({
        status: 409,
        code: 'FOLLOW_UP_PATIENT_INACTIVE',
        message: 'Paciente inativo não recebe registro.',
      });
    }
    const { form, version } = answerableVersion(
      body.formId,
      body.formVersionId,
      patient.id,
    );
    const checked = checkAnswers(version.fields, body.answers ?? []);
    if (checked.kind === 'empty') {
      throw new ApiError({
        status: 422,
        code: 'FOLLOW_UP_EMPTY',
        message: 'Preencha ao menos um campo do formulário antes de enviar.',
        fields: [{ field: 'answers', code: 'EMPTY' }],
      });
    }
    if (checked.kind === 'invalid') {
      throw new ApiError({
        status: 422,
        code: 'FOLLOW_UP_INVALID_ANSWERS',
        message: 'Revise as respostas indicadas.',
        fields: checked.errors,
      });
    }
    const values = new Map(
      checked.items.map((item) => [item.fieldId, item.value]),
    );
    const followUp = {
      id: nextId('f0120000'),
      patientId: patient.id,
      form: {
        id: form.id,
        name: form.name,
        versionId: version.id,
        versionNumber: version.number,
      },
      author: { id: viewer.user.id, name: viewer.user.name },
      visitedAt: visitedAt.toISOString(),
      submittedAt: now.toISOString(),
      notes,
      status: 'valid',
      annulment: null,
      answers: version.fields
        .filter((field) => values.has(field.id))
        .map((field) => ({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          name: field.name,
          fieldType: field.fieldType,
          unit: field.unit,
          section: field.section,
          position: field.position,
          value: values.get(field.id),
        })),
    };
    addFollowUp(followUp);
    return respond(followUp);
  });
}

/**
 * Anula o registro com motivo, uma vez só e sem prazo. Profissional e
 * administrador anulam qualquer registro; a cuidadora, só os que ela fez.
 */
export function annulFollowUp(followUpId, { reason } = {}) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requireAnyPermission(viewer, [P.FOLLOW_UPS_ANNUL, P.FOLLOW_UPS_CREATE]);
    const text = typeof reason === 'string' ? reason.trim() : '';
    if (!text || text.length > MAX_REASON_LENGTH) {
      throw validationError([
        { field: 'reason', code: text ? 'MAX_LENGTH' : 'MIN_LENGTH' },
      ]);
    }
    const followUp = findFollowUp(followUpId);
    if (!followUp) {
      throw followUpNotFound();
    }
    if (!viewer.permissions.includes(P.FOLLOW_UPS_ANNUL)) {
      if (!canReach(viewer, followUp.patientId)) {
        throw followUpNotFound();
      }
      if (followUp.author.id !== viewer.user.id) {
        throw new ApiError({
          status: 403,
          code: 'FOLLOW_UP_NOT_AUTHOR',
          message: 'Só quem fez o registro pode anulá-lo.',
        });
      }
    }
    if (followUp.status === 'annulled') {
      throw new ApiError({
        status: 409,
        code: 'FOLLOW_UP_ALREADY_ANNULLED',
        message: 'O registro já foi anulado.',
      });
    }
    markAnnulled(followUp.id, {
      annulledAt: new Date().toISOString(),
      annulledBy: { id: viewer.user.id, name: viewer.user.name },
      reason: text,
    });
    return respond(findFollowUp(followUp.id));
  });
}

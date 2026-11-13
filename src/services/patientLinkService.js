// Vínculos usuário–paciente simulados, no formato das rotas `patient-links`
// da API (manual `patient-links-*.md`, conferido em 10/11/2026).
import { PERMISSIONS as P } from '../constants/permissions.js';
import { currentViewer } from './authService.js';
import {
  ApiError,
  mockRequest,
  paginate,
  requirePermission,
  respond,
} from './mockApi.js';
import {
  addLink,
  allLinks,
  changeLink,
  findPatient,
  nextId,
  patientNotFound,
} from './patientStore.js';
import { allUsers, findUser } from './userStore.js';

export const LINK_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'PATIENT_LINK_NOT_FOUND',
  ALREADY_EXISTS: 'PATIENT_LINK_ALREADY_EXISTS',
  INVALID_USER: 'PATIENT_LINK_INVALID_USER',
  RESPONSIBLE_READ_ONLY: 'PATIENT_LINK_RESPONSIBLE_READ_ONLY',
  REVOKED: 'PATIENT_LINK_REVOKED',
  PATIENT_INACTIVE: 'PATIENT_INACTIVE',
});

const CODES = LINK_ERROR_CODES;

const ROLE_PROFILES = {
  responsible_professional: ['professional', 'admin'],
  caregiver: ['caregiver'],
  family: ['family'],
};

const ROLE_ORDER = ['responsible_professional', 'caregiver', 'family'];

const conflict = (code, message) =>
  new ApiError({ status: 409, code, message });

// O vínculo de responsável vem do cadastro do paciente; o identificador é
// derivado do paciente, e ele não aceita edição nem revogação por aqui.
function responsibleLinkId(patientId) {
  return `b0b00000-0000-5000-8000-${patientId.slice(-12)}`;
}

function responsibleLink(patient) {
  return {
    id: responsibleLinkId(patient.id),
    patientId: patient.id,
    userId: patient.responsible.id,
    role: 'responsible_professional',
    linkType: null,
    note: null,
    status: 'active',
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
    revokedAt: null,
  };
}

function toApiLink(link) {
  const patient = findPatient(link.patientId);
  const user = findUser(link.userId);
  return {
    id: link.id,
    patient: { id: patient.id, name: patient.name, status: patient.status },
    user: {
      id: user.id,
      name: user.name,
      profile: user.profile.code,
      status: user.status,
    },
    role: link.role,
    linkType: link.linkType,
    note: link.note,
    status: link.status,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    revokedAt: link.revokedAt,
  };
}

function manage() {
  const viewer = currentViewer();
  requirePermission(viewer, P.PATIENT_LINKS_MANAGE);
  return viewer;
}

/** Vínculos de um paciente: o responsável primeiro, depois cuidadores e familiares. */
export function listPatientLinks({
  patientId,
  status = 'active',
  page,
  limit,
}) {
  return mockRequest(() => {
    manage();
    const patient = findPatient(patientId);
    if (!patient) {
      return paginate([], { page, limit });
    }
    const care = allLinks().filter(
      (link) => link.patientId === patientId && link.status === status,
    );
    const links =
      status === 'active' ? [responsibleLink(patient), ...care] : care;
    const items = links
      .map(toApiLink)
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          a.user.name.localeCompare(b.user.name, 'pt-BR'),
      );
    return paginate(items, { page, limit });
  });
}

/** Usuários que podem ocupar o papel: só id, nome, perfil e situação. */
export function listEligibleUsers({ role, search, page, limit }) {
  return mockRequest(() => {
    manage();
    const term = search?.trim().toLowerCase();
    const items = allUsers()
      .filter((user) => ROLE_PROFILES[role].includes(user.profile.code))
      .filter((user) => ['active', 'pending'].includes(user.status))
      .filter((user) => !term || user.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((user) => ({
        id: user.id,
        name: user.name,
        profile: user.profile.code,
        status: user.status,
      }));
    return paginate(items, { page, limit });
  });
}

export function createPatientLink({
  patientId,
  userId,
  linkType = null,
  note = null,
}) {
  return mockRequest(() => {
    manage();
    const patient = findPatient(patientId);
    if (!patient) {
      throw patientNotFound();
    }
    if (patient.status === 'inactive') {
      throw conflict(
        CODES.PATIENT_INACTIVE,
        'Paciente inativo não recebe vínculo novo.',
      );
    }
    const user = findUser(userId);
    // O papel vem do perfil do usuário: só cuidador e familiar recebem vínculo.
    const role = user?.profile.code;
    if (
      !user ||
      !['caregiver', 'family'].includes(role) ||
      user.status === 'inactive'
    ) {
      throw new ApiError({
        status: 422,
        code: CODES.INVALID_USER,
        message: 'Escolha um cuidador ou familiar ativo da organização.',
        fields: [{ field: 'userId', code: 'INVALID_USER' }],
      });
    }
    const exists = allLinks().some(
      (link) =>
        link.status === 'active' &&
        link.patientId === patientId &&
        link.userId === userId,
    );
    if (exists) {
      throw conflict(
        CODES.ALREADY_EXISTS,
        'O usuário já tem vínculo vigente com o paciente.',
      );
    }
    const now = new Date().toISOString();
    const link = {
      id: nextId('11c00000'),
      patientId,
      userId,
      role,
      linkType,
      note,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    addLink(link);
    return respond(toApiLink(link));
  });
}

function careLink(linkId) {
  if (linkId.startsWith('b0b00000-')) {
    throw conflict(
      CODES.RESPONSIBLE_READ_ONLY,
      'O responsável muda na edição do paciente.',
    );
  }
  const link = allLinks().find((item) => item.id === linkId);
  if (!link) {
    throw new ApiError({
      status: 404,
      code: CODES.NOT_FOUND,
      message: 'Vínculo não encontrado.',
    });
  }
  if (link.status === 'revoked') {
    throw conflict(CODES.REVOKED, 'O vínculo já foi revogado.');
  }
  return link;
}

export function updatePatientLink(linkId, { linkType = null, note = null }) {
  return mockRequest(() => {
    manage();
    const link = careLink(linkId);
    if (findPatient(link.patientId).status === 'inactive') {
      throw conflict(CODES.PATIENT_INACTIVE, 'O paciente está inativo.');
    }
    const changes = { linkType, note, updatedAt: new Date().toISOString() };
    changeLink(linkId, changes);
    return respond(toApiLink({ ...link, ...changes }));
  });
}

export function revokePatientLink(linkId) {
  return mockRequest(() => {
    manage();
    const link = careLink(linkId);
    const now = new Date().toISOString();
    const changes = { status: 'revoked', revokedAt: now, updatedAt: now };
    changeLink(linkId, changes);
    return respond(toApiLink({ ...link, ...changes }));
  });
}

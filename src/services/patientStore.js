// Estado simulado de pacientes e vínculos, lido pelos serviços ainda
// simulados (registros, formulários, alertas, medicamentos, anexos, painel,
// relatórios, usuários e organizações). Pacientes e vínculos já vêm da API;
// este estado sai com o último desses serviços (FE-65 do INTEGRACAO.md).
// Aplica o alcance de cada perfil, como `patient.policy.ts` do backend.
import { patientLinks as seedLinks } from '../data/mocks/patientLinks.js';
import { patients as seedPatients } from '../data/mocks/patients.js';
import { ApiError, registerMockState } from './mockApi.js';

let patientChanges = new Map();
let linkChanges = new Map();
let sequence = 0;

registerMockState(() => {
  patientChanges = new Map();
  linkChanges = new Map();
  sequence = 0;
});

/** Identificador novo no formato de UUID, estável dentro da sessão. */
export function nextId(prefix) {
  sequence += 1;
  return `${prefix}-0000-5000-8000-${String(sequence).padStart(12, '0')}`;
}

export function allPatients() {
  return seedPatients.map((patient) => ({
    ...patient,
    ...patientChanges.get(patient.id),
  }));
}

export function findPatient(patientId) {
  return allPatients().find((patient) => patient.id === patientId) ?? null;
}

/** Mudança no paciente simulado, como a situação que um teste precisa. */
export function changePatient(patientId, changes) {
  patientChanges.set(patientId, {
    ...patientChanges.get(patientId),
    ...changes,
  });
}

export function allLinks() {
  return seedLinks.map((link) => ({ ...link, ...linkChanges.get(link.id) }));
}

export function changeLink(linkId, changes) {
  linkChanges.set(linkId, { ...linkChanges.get(linkId), ...changes });
}

// Administrador e profissional leem a organização inteira; cuidador e
// familiar, só os pacientes com vínculo vigente no papel do próprio perfil.
const ORGANIZATION_WIDE = ['admin', 'professional'];

function viewerLink(viewer, patientId) {
  const role = viewer.user.profile.code;
  return (
    allLinks().find(
      (link) =>
        link.status === 'active' &&
        link.patientId === patientId &&
        link.userId === viewer.user.id &&
        link.role === role,
    ) ?? null
  );
}

/** Administrador e profissional leem a organização inteira. */
export function readsWholeOrganization(viewer) {
  return ORGANIZATION_WIDE.includes(viewer.user.profile.code);
}

export function canReach(viewer, patientId) {
  return (
    readsWholeOrganization(viewer) || viewerLink(viewer, patientId) !== null
  );
}

export function patientNotFound() {
  return new ApiError({
    status: 404,
    code: 'PATIENT_NOT_FOUND',
    message: 'Paciente não encontrado.',
  });
}

/** Paciente ao alcance da sessão; fora dele, `404` igual ao inexistente. */
export function reachablePatient(viewer, patientId) {
  const patient = findPatient(patientId);
  if (!patient || !canReach(viewer, patientId)) {
    throw patientNotFound();
  }
  return patient;
}

export function isFamily(viewer) {
  return viewer.user.profile.code === 'family';
}

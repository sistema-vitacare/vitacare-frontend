// Estado simulado de pacientes e vínculos, compartilhado pelos serviços de
// pacientes, vínculos e registros. Guarda o que a API guardaria no banco
// (cadastro novo, edição, inativação, vínculo criado ou revogado) e aplica o
// alcance de cada perfil, como `patient.policy.ts` do backend.
import { patientLinks as seedLinks } from '../data/mocks/patientLinks.js';
import { patients as seedPatients } from '../data/mocks/patients.js';
import { MASKED_VALUE } from '../utils/format.js';
import { ApiError, registerMockState } from './mockApi.js';

let createdPatients = [];
let patientChanges = new Map();
let createdLinks = [];
let linkChanges = new Map();
let sequence = 0;

registerMockState(() => {
  createdPatients = [];
  patientChanges = new Map();
  createdLinks = [];
  linkChanges = new Map();
  sequence = 0;
});

/** Identificador novo no formato de UUID, estável dentro da sessão. */
export function nextId(prefix) {
  sequence += 1;
  return `${prefix}-0000-5000-8000-${String(sequence).padStart(12, '0')}`;
}

export function allPatients() {
  return [
    ...seedPatients.map((patient) => ({
      ...patient,
      ...patientChanges.get(patient.id),
    })),
    ...createdPatients,
  ];
}

export function findPatient(patientId) {
  return allPatients().find((patient) => patient.id === patientId) ?? null;
}

export function addPatient(patient) {
  createdPatients = [...createdPatients, patient];
}

export function changePatient(patientId, changes) {
  const created = createdPatients.find((patient) => patient.id === patientId);
  if (created) {
    createdPatients = createdPatients.map((patient) =>
      patient.id === patientId ? { ...patient, ...changes } : patient,
    );
    return;
  }
  patientChanges.set(patientId, {
    ...patientChanges.get(patientId),
    ...changes,
  });
}

export function allLinks() {
  return [
    ...seedLinks.map((link) => ({ ...link, ...linkChanges.get(link.id) })),
    ...createdLinks,
  ];
}

export function addLink(link) {
  createdLinks = [...createdLinks, link];
}

export function changeLink(linkId, changes) {
  if (createdLinks.some((link) => link.id === linkId)) {
    createdLinks = createdLinks.map((link) =>
      link.id === linkId ? { ...link, ...changes } : link,
    );
    return;
  }
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

// O familiar vê o recorte da Figura 37: contato, documento, endereço,
// plano de saúde e observações saem com a máscara fixa, mesmo vazios.
const FAMILY_MASKED = ['cpf', 'phone', 'email', 'healthPlan', 'notes'];

function maskForFamily(patient) {
  const masked = Object.fromEntries(
    FAMILY_MASKED.map((field) => [field, MASKED_VALUE]),
  );
  const address = Object.fromEntries(
    Object.keys(patient.address).map((field) => [field, MASKED_VALUE]),
  );
  return { ...patient, ...masked, address };
}

// Na listagem, a API mostra só os seis dígitos do meio do CPF.
function maskCpfForList(cpf) {
  return cpf ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null;
}

export function isFamily(viewer) {
  return viewer.user.profile.code === 'family';
}

/** Paciente como a API o devolve para a sessão, na listagem ou no detalhe. */
export function patientForViewer(patient, viewer, { listing = false } = {}) {
  const link = viewerLink(viewer, patient.id);
  const view = {
    ...patient,
    viewerLink: link ? { role: link.role, linkType: link.linkType } : null,
  };
  if (isFamily(viewer)) {
    return maskForFamily(view);
  }
  return listing ? { ...view, cpf: maskCpfForList(view.cpf) } : view;
}

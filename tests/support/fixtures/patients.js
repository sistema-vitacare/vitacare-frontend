// Pacientes dos dados dos testes (`tests/support/data/`) no formato da API
// (`patients-listar.md` e `patients-consultar.md`), para os testes das telas
// que leem pacientes. Nenhuma regra do backend é aplicada: o teste diz a
// lista que a API devolveria.
import { patients } from '../data/patients.js';
import { apiFailure, apiPage } from '../apiStub.js';

/** Paciente como o detalhe da API o devolve, com `changes` por cima. */
export function apiPatient(id, changes = {}) {
  const patient = patients.find((item) => item.id === id);
  return { ...patient, viewerLink: null, ...changes };
}

/** Pacientes ativos, por nome, como a lista padrão da API. */
export function activePatients() {
  return patients
    .filter((patient) => patient.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((patient) => apiPatient(patient.id));
}

// Na listagem, a API mostra só os seis dígitos do meio do CPF.
function listed(patient) {
  const { cpf } = patient;
  return cpf?.length === 11
    ? { ...patient, cpf: `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` }
    : patient;
}

/**
 * Rotas de pacientes: a lista responde `list`; o detalhe, o paciente de
 * `others` (como um inativo, que a lista não traz) ou de `list` e, fora
 * deles, o dos dados dos testes.
 */
export function patientRoutes(list = activePatients(), others = []) {
  const known = [...others, ...list];
  return {
    'GET /patients': ({ query }) =>
      apiPage(list.map(listed), { limit: Number(query.limit ?? 20) }),
    'GET /patients/:patientId': ({ params }) => {
      const patient =
        known.find((item) => item.id === params.patientId) ??
        (patients.some((item) => item.id === params.patientId)
          ? apiPatient(params.patientId)
          : null);
      return patient
        ? { data: patient, meta: {} }
        : apiFailure(404, 'PATIENT_NOT_FOUND', 'Paciente não encontrado.');
    },
  };
}

// Medicamentos no formato da API (`medications-listar.md`), para os testes da
// tela de medicamentos e do roteador. Nenhuma regra do backend é aplicada: o
// próximo horário e o horário coincidente vêm escritos aqui, como a API os
// devolveria.
import { apiPage } from '../apiStub.js';

export const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
export const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
export const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

export const LOSARTANA = '2cfba5e6-92b2-5822-8f2b-4220431410a5';
export const HIDROCLOROTIAZIDA = '8f62d81f-d9dc-5bcf-baa0-ac5718ffac50';
export const AAS = '659f563e-3fad-5bc5-ba54-543a50a4e7f0';
const SINVASTATINA = '4a7e2f1c-8b3d-5e6f-9a0b-1c2d3e4f5a6b';
const COLECALCIFEROL = '5b8c3d2e-9f4a-5b1c-8d7e-2f3a4b5c6d7e';
const AMOXICILINA = '6c9d4e3f-0a5b-5c2d-9e8f-3a4b5c6d7e8f';

const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

/** Um medicamento como a API devolve, com as mudanças do teste. */
export function apiMedication(id, patientId, name, changes = {}) {
  const { schedule, ...rest } = changes;
  return {
    id,
    patientId,
    name,
    doseAmount: 1,
    doseUnit: 'tablet',
    route: 'oral',
    notes: null,
    schedule: {
      startDate: '2026-10-01',
      endDate: null,
      intervalDays: 1,
      times: ['08:00'],
      timeZone: 'America/Sao_Paulo',
      ...schedule,
    },
    remindersEnabled: true,
    nextScheduledAt: '2026-12-01T11:00:00.000Z',
    scheduleConflicts: [],
    status: 'active',
    createdBy: RAFAEL,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    deactivatedAt: null,
    ...rest,
  };
}

const conflictWith = (medicationId, medicationName, time) => [
  { medicationId, medicationName, time },
];

/** Os medicamentos de Dirce, Benedito e Iolanda; uma lista nova a cada chamada. */
export function allMedications() {
  return [
    apiMedication(LOSARTANA, DIRCE, 'Losartana potássica 50 mg', {
      schedule: { times: ['08:00', '20:00'] },
      scheduleConflicts: conflictWith(
        HIDROCLOROTIAZIDA,
        'Hidroclorotiazida 25 mg',
        '08:00',
      ),
    }),
    apiMedication(HIDROCLOROTIAZIDA, DIRCE, 'Hidroclorotiazida 25 mg', {
      notes: 'Tomar após o café da manhã.',
      scheduleConflicts: conflictWith(
        LOSARTANA,
        'Losartana potássica 50 mg',
        '08:00',
      ),
    }),
    apiMedication(AAS, DIRCE, 'Ácido acetilsalicílico 100 mg', {
      schedule: { times: ['13:00'] },
    }),
    apiMedication(SINVASTATINA, DIRCE, 'Sinvastatina 20 mg', {
      schedule: { startDate: '2026-06-01', times: ['21:00'] },
      nextScheduledAt: null,
      status: 'inactive',
      deactivatedAt: '2026-10-20T13:00:00.000Z',
    }),
    apiMedication(COLECALCIFEROL, BENEDITO, 'Colecalciferol 7.000 UI', {
      doseUnit: 'capsule',
      schedule: { intervalDays: 7, times: ['09:00'] },
      remindersEnabled: false,
    }),
    apiMedication(AMOXICILINA, IOLANDA, 'Amoxicilina 500 mg', {
      doseUnit: 'capsule',
      schedule: {
        startDate: '2026-10-20',
        endDate: '2026-10-26',
        times: ['07:00', '15:00', '23:00'],
      },
      remindersEnabled: false,
      nextScheduledAt: null,
    }),
  ];
}

/**
 * `GET /medications` com os medicamentos do paciente pedido. A lista é lida
 * a cada requisição, então o teste que a altera vê a tela recarregar.
 */
export function medicationRoutes(list = allMedications()) {
  return {
    'GET /medications': ({ query }) =>
      apiPage(
        list.filter((medication) => medication.patientId === query.patientId),
        { limit: Number(query.limit) },
      ),
  };
}

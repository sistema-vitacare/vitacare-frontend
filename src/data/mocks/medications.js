// Medicamentos dos pacientes, com os campos de GET /medications. O próximo
// horário (`nextScheduledAt`) e o horário coincidente com outro medicamento
// (`scheduleConflicts`) dependem do momento da consulta e dos outros
// medicamentos; o estado de medicamentos os calcula como a API, e aqui eles
// ficam vazios. As datas são fixas: um tratamento encerrado continua
// encerrado, e o "há N dias" cresce com o tempo, como na API.

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};
const BEATRIZ = {
  id: 'd5a58f5d-395e-5548-a230-de2350de4651',
  name: 'Beatriz Okamoto',
};

const CREATED_AT = '2026-10-01T12:00:00.000Z';

function medication({
  id,
  patientId,
  name,
  doseAmount = 1,
  doseUnit,
  route,
  times,
  notes = null,
  startDate = '2026-10-01',
  endDate = null,
  intervalDays = 1,
  remindersEnabled = true,
  createdBy,
  createdAt = CREATED_AT,
  deactivatedAt = null,
}) {
  return {
    id,
    patientId,
    name,
    doseAmount,
    doseUnit,
    route,
    notes,
    schedule: {
      startDate,
      endDate,
      intervalDays,
      times,
      timeZone: 'America/Sao_Paulo',
    },
    remindersEnabled,
    nextScheduledAt: null,
    scheduleConflicts: [],
    status: deactivatedAt ? 'inactive' : 'active',
    createdBy,
    createdAt,
    updatedAt: deactivatedAt ?? createdAt,
    deactivatedAt,
  };
}

export const medications = [
  // Losartana e hidroclorotiazida às 08:00 mostram o aviso de horário
  // coincidente, que não bloqueia.
  medication({
    id: '2cfba5e6-92b2-5822-8f2b-4220431410a5',
    patientId: DIRCE,
    name: 'Losartana potássica 50 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['08:00', '20:00'],
    createdBy: RAFAEL,
  }),
  medication({
    id: '8f62d81f-d9dc-5bcf-baa0-ac5718ffac50',
    patientId: DIRCE,
    name: 'Hidroclorotiazida 25 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['08:00'],
    notes: 'Tomar após o café da manhã.',
    createdBy: RAFAEL,
  }),
  medication({
    id: '659f563e-3fad-5bc5-ba54-543a50a4e7f0',
    patientId: DIRCE,
    name: 'Ácido acetilsalicílico 100 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['13:00'],
    notes: 'Tomar após o almoço.',
    createdBy: RAFAEL,
  }),
  // Inativo: a "Suspensa" da Figura 41, que a API guarda como inativa.
  medication({
    id: '4a7e2f1c-8b3d-5e6f-9a0b-1c2d3e4f5a6b',
    patientId: DIRCE,
    name: 'Sinvastatina 20 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['21:00'],
    startDate: '2026-06-01',
    createdBy: RAFAEL,
    createdAt: '2026-06-01T12:00:00.000Z',
    deactivatedAt: '2026-10-20T13:00:00.000Z',
  }),
  medication({
    id: 'dd0d6b95-e958-5d44-8a7f-c15849cb8335',
    patientId: OSVALDO,
    name: 'Metformina 850 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['08:00', '20:00'],
    createdBy: BEATRIZ,
  }),
  medication({
    id: '14eda394-3bdb-5341-bdff-2a52bd3ed8ea',
    patientId: OSVALDO,
    name: 'Insulina NPH',
    doseAmount: 10,
    doseUnit: 'iu',
    route: 'subcutaneous',
    times: ['07:00'],
    createdBy: BEATRIZ,
  }),
  medication({
    id: '917ff7a3-b707-5c4e-bccc-e5187948991a',
    patientId: BENEDITO,
    name: 'Formoterol com budesonida',
    doseUnit: 'application',
    route: 'inhalation',
    times: ['08:00', '20:00'],
    createdBy: RAFAEL,
  }),
  // Uma vez por semana e sem lembrete: o lembrete é opcional (UC08).
  medication({
    id: '5b8c3d2e-9f4a-5b1c-8d7e-2f3a4b5c6d7e',
    patientId: BENEDITO,
    name: 'Colecalciferol 7.000 UI',
    doseUnit: 'capsule',
    route: 'oral',
    times: ['09:00'],
    intervalDays: 7,
    remindersEnabled: false,
    notes: 'Uma vez por semana, com uma refeição.',
    createdBy: RAFAEL,
  }),
  medication({
    id: '03330a44-3b39-575a-adac-9ab8c1bcd677',
    patientId: IOLANDA,
    name: 'Anlodipino 5 mg',
    doseUnit: 'tablet',
    route: 'oral',
    times: ['21:00'],
    createdBy: BEATRIZ,
  }),
  // Tratamento com fim: continua ativo, sem próximo horário.
  medication({
    id: '6c9d4e3f-0a5b-5c2d-9e8f-3a4b5c6d7e8f',
    patientId: IOLANDA,
    name: 'Amoxicilina 500 mg',
    doseUnit: 'capsule',
    route: 'oral',
    times: ['07:00', '15:00', '23:00'],
    startDate: '2026-10-20',
    endDate: '2026-10-26',
    remindersEnabled: false,
    notes: 'Tratamento de sete dias.',
    createdBy: BEATRIZ,
    createdAt: '2026-10-20T12:00:00.000Z',
  }),
];

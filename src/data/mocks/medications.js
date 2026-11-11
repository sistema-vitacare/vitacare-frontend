// Medicamentos dos pacientes, com os campos de GET /medications. O
// `nextScheduledAt` da API depende do horário da consulta; o serviço de
// medicamentos (FE-19) o calcula, e aqui ele fica vazio.

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
  doseAmount,
  doseUnit,
  route,
  times,
  notes = null,
  createdBy,
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
      startDate: '2026-10-01',
      endDate: null,
      intervalDays: 1,
      times,
      timeZone: 'America/Sao_Paulo',
    },
    remindersEnabled: true,
    nextScheduledAt: null,
    scheduleConflicts: [],
    status: 'active',
    createdBy,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    deactivatedAt: null,
  };
}

export const medications = [
  medication({
    id: '2cfba5e6-92b2-5822-8f2b-4220431410a5',
    patientId: DIRCE,
    name: 'Losartana potássica 50 mg',
    doseAmount: 1,
    doseUnit: 'tablet',
    route: 'oral',
    times: ['08:00', '20:00'],
    createdBy: RAFAEL,
  }),
  medication({
    id: '8f62d81f-d9dc-5bcf-baa0-ac5718ffac50',
    patientId: DIRCE,
    name: 'Hidroclorotiazida 25 mg',
    doseAmount: 1,
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
    doseAmount: 1,
    doseUnit: 'tablet',
    route: 'oral',
    times: ['13:00'],
    notes: 'Tomar após o almoço.',
    createdBy: RAFAEL,
  }),
  medication({
    id: 'dd0d6b95-e958-5d44-8a7f-c15849cb8335',
    patientId: OSVALDO,
    name: 'Metformina 850 mg',
    doseAmount: 1,
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
    doseAmount: 1,
    doseUnit: 'application',
    route: 'inhalation',
    times: ['08:00', '20:00'],
    createdBy: RAFAEL,
  }),
  medication({
    id: '03330a44-3b39-575a-adac-9ab8c1bcd677',
    patientId: IOLANDA,
    name: 'Anlodipino 5 mg',
    doseAmount: 1,
    doseUnit: 'tablet',
    route: 'oral',
    times: ['21:00'],
    createdBy: BEATRIZ,
  }),
];

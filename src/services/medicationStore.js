// Estado simulado dos medicamentos, compartilhado pelos serviços de
// medicamentos e de pacientes. Guarda o que a API guardaria no banco
// (cadastro, edição, inativação e reativação) e monta cada medicamento como
// a API o devolve, com o próximo horário e o horário coincidente calculados
// no momento da consulta.
import { medications as seedMedications } from '../data/mocks/medications.js';
import { todayInSaoPaulo } from '../utils/format.js';
import {
  findScheduleConflicts,
  nextOccurrence,
} from '../utils/medicationSchedule.js';
import { registerMockState } from './mockApi.js';

let createdMedications = [];
let medicationChanges = new Map();

registerMockState(() => {
  createdMedications = [];
  medicationChanges = new Map();
});

export function allMedications() {
  return [
    ...seedMedications.map((medication) => ({
      ...medication,
      ...medicationChanges.get(medication.id),
    })),
    ...createdMedications,
  ];
}

export function findMedication(medicationId) {
  return (
    allMedications().find((medication) => medication.id === medicationId) ??
    null
  );
}

export function addMedication(medication) {
  createdMedications = [...createdMedications, medication];
}

export function changeMedication(medicationId, changes) {
  if (createdMedications.some((item) => item.id === medicationId)) {
    createdMedications = createdMedications.map((item) =>
      item.id === medicationId ? { ...item, ...changes } : item,
    );
    return;
  }
  medicationChanges.set(medicationId, {
    ...medicationChanges.get(medicationId),
    ...changes,
  });
}

/**
 * Medicamento como a API o devolve: o próximo horário da agenda a partir de
 * agora e os horários iguais aos de outro medicamento ativo do paciente.
 * Inativo não tem nenhum dos dois.
 */
export function medicationView(medication, now = new Date()) {
  if (medication.status !== 'active') {
    return { ...medication, nextScheduledAt: null, scheduleConflicts: [] };
  }
  const others = allMedications().filter(
    (item) =>
      item.patientId === medication.patientId &&
      item.status === 'active' &&
      item.id !== medication.id,
  );
  return {
    ...medication,
    nextScheduledAt:
      nextOccurrence(medication.schedule, now)?.toISOString() ?? null,
    scheduleConflicts: findScheduleConflicts(
      medication.schedule,
      others,
      todayInSaoPaulo(now),
    ),
  };
}

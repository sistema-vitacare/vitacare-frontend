// Valores do formulário de medicamento e a conversão para o corpo de POST e
// PATCH /medications. O corpo é conferido com as regras da API
// (`medicationFields.js`); aqui fica só a ponte entre os campos da tela e a
// API: vírgula decimal, opcional vazio como nulo e, na edição, só o que
// mudou, porque a API recusa a edição sem mudança.
import { decimalText, parseDecimal, parseInteger } from './numberInput.js';

const blankToNull = (text) => (text.trim() === '' ? null : text);

const filledTimes = (times) =>
  times.map((time) => time.trim()).filter((time) => time !== '');

/** Formulário vazio: início hoje, todo dia e um horário a preencher. */
export function emptyMedicationValues(today) {
  return {
    name: '',
    dose: '',
    doseUnit: '',
    route: '',
    notes: '',
    startDate: today,
    endDate: '',
    intervalDays: '1',
    times: [''],
    remindersEnabled: false,
  };
}

/** Formulário com o medicamento gravado. */
export function medicationValues(medication) {
  const { schedule } = medication;
  return {
    name: medication.name,
    dose: decimalText(medication.doseAmount),
    doseUnit: medication.doseUnit,
    route: medication.route ?? '',
    notes: medication.notes ?? '',
    startDate: schedule.startDate,
    endDate: schedule.endDate ?? '',
    intervalDays: String(schedule.intervalDays),
    times: [...schedule.times],
    remindersEnabled: medication.remindersEnabled,
  };
}

/** Corpo de POST /medications. */
export function createBody(patientId, values) {
  return {
    patientId,
    name: values.name,
    doseAmount: parseDecimal(values.dose),
    doseUnit: values.doseUnit,
    route: values.route || null,
    notes: blankToNull(values.notes),
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    intervalDays: parseInteger(values.intervalDays),
    times: filledTimes(values.times),
    remindersEnabled: values.remindersEnabled,
  };
}

const sameTimes = (a, b) => [...a].sort().join() === [...b].sort().join();

/** Corpo de PATCH /medications/{id}: só os campos que mudaram. */
export function updateBody(medication, values) {
  const { schedule } = medication;
  const next = {
    name: values.name,
    doseAmount: parseDecimal(values.dose),
    doseUnit: values.doseUnit,
    route: values.route || null,
    notes: blankToNull(values.notes),
    startDate: values.startDate,
    endDate: values.endDate || null,
    intervalDays: parseInteger(values.intervalDays),
    times: filledTimes(values.times),
    remindersEnabled: values.remindersEnabled,
  };
  const recorded = {
    name: medication.name,
    doseAmount: medication.doseAmount,
    doseUnit: medication.doseUnit,
    route: medication.route,
    notes: medication.notes,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    intervalDays: schedule.intervalDays,
    remindersEnabled: medication.remindersEnabled,
  };
  const body = {};
  for (const [field, value] of Object.entries(recorded)) {
    const typed =
      typeof next[field] === 'string' ? next[field].trim() : next[field];
    if (typed !== value) {
      body[field] = next[field];
    }
  }
  if (!sameTimes(next.times, schedule.times)) {
    body.times = next.times;
  }
  return body;
}

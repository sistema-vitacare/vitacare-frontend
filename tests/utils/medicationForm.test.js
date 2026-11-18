// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createBody,
  emptyMedicationValues,
  medicationValues,
  updateBody,
} from '../../src/utils/medicationForm.js';

const PATIENT = '0b639b83-76d0-570a-9017-7b6263d892cf';

const medication = {
  id: 'm1',
  patientId: PATIENT,
  name: 'Losartana potássica 50 mg',
  doseAmount: 0.5,
  doseUnit: 'tablet',
  route: 'oral',
  notes: null,
  schedule: {
    startDate: '2026-10-01',
    endDate: null,
    intervalDays: 1,
    times: ['08:00', '20:00'],
    timeZone: 'America/Sao_Paulo',
  },
  remindersEnabled: true,
};

describe('valores do formulário', () => {
  it('começa vazio, com início hoje, intervalo de 1 dia e um horário a preencher', () => {
    expect(emptyMedicationValues('2026-11-12')).toEqual({
      name: '',
      dose: '',
      doseUnit: '',
      route: '',
      notes: '',
      startDate: '2026-11-12',
      endDate: '',
      intervalDays: '1',
      times: [''],
      remindersEnabled: false,
    });
  });

  it('traz o medicamento gravado, com a dose em vírgula decimal', () => {
    expect(medicationValues(medication)).toEqual({
      name: 'Losartana potássica 50 mg',
      dose: '0,5',
      doseUnit: 'tablet',
      route: 'oral',
      notes: '',
      startDate: '2026-10-01',
      endDate: '',
      intervalDays: '1',
      times: ['08:00', '20:00'],
      remindersEnabled: true,
    });
  });
});

describe('createBody', () => {
  it('monta o corpo do cadastro, com vírgula decimal, opcionais vazios como nulo e sem horário em branco', () => {
    const body = createBody(PATIENT, {
      ...emptyMedicationValues('2026-11-12'),
      name: ' Dipirona ',
      dose: '0,5',
      doseUnit: 'tablet',
      intervalDays: '2',
      times: ['20:00', '', ' 08:00'],
    });

    expect(body).toEqual({
      patientId: PATIENT,
      name: ' Dipirona ',
      doseAmount: 0.5,
      doseUnit: 'tablet',
      route: null,
      notes: null,
      startDate: '2026-11-12',
      endDate: null,
      intervalDays: 2,
      times: ['20:00', '08:00'],
      remindersEnabled: false,
    });
  });

  it('deixa dose e intervalo inválidos como estão, para a regra da API apontar o campo', () => {
    const body = createBody(PATIENT, {
      ...emptyMedicationValues('2026-11-12'),
      dose: 'meio',
      intervalDays: '1,5',
    });

    expect(Number.isNaN(body.doseAmount)).toBe(true);
    expect(Number.isNaN(body.intervalDays)).toBe(true);
    expect(
      createBody(PATIENT, emptyMedicationValues('2026-11-12')),
    ).toMatchObject({ doseAmount: undefined, times: [] });
  });
});

describe('updateBody', () => {
  it('manda só os campos alterados', () => {
    expect(
      updateBody(medication, {
        ...medicationValues(medication),
        name: 'Losartana potássica 100 mg',
        endDate: '2026-12-31',
        remindersEnabled: false,
      }),
    ).toEqual({
      name: 'Losartana potássica 100 mg',
      endDate: '2026-12-31',
      remindersEnabled: false,
    });
  });

  it('não vê mudança na mesma dose escrita de outro jeito nem nos mesmos horários em outra ordem', () => {
    expect(
      updateBody(medication, {
        ...medicationValues(medication),
        name: ' Losartana potássica 50 mg ',
        dose: '0,50',
        times: ['20:00', '08:00'],
      }),
    ).toEqual({});
  });

  it('limpa via, observação e fim com nulo', () => {
    const recorded = {
      ...medication,
      notes: 'Após o café.',
      schedule: { ...medication.schedule, endDate: '2026-12-31' },
    };

    expect(
      updateBody(recorded, {
        ...medicationValues(recorded),
        route: '',
        notes: ' ',
        endDate: '',
      }),
    ).toEqual({ route: null, notes: null, endDate: null });
  });
});

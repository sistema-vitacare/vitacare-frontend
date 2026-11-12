// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { medicationErrors } from '../../src/utils/medicationFields.js';

const TODAY = '2026-11-12';
const PATIENT = '0b639b83-76d0-570a-9017-7b6263d892cf';

const valid = {
  patientId: PATIENT,
  name: 'Losartana potássica 50 mg',
  doseAmount: 1,
  doseUnit: 'tablet',
  route: 'oral',
  notes: null,
  startDate: '2026-11-01',
  endDate: null,
  intervalDays: 1,
  times: ['08:00', '20:00'],
  remindersEnabled: true,
};

const errorsOf = (body, options = {}) =>
  medicationErrors(body, { today: TODAY, ...options });

const fieldsOf = (body, options) =>
  errorsOf(body, options).map(({ field, code }) => `${field}:${code}`);

describe('medicationErrors no cadastro', () => {
  it('aceita o corpo completo e o mínimo, com os opcionais ausentes', () => {
    expect(errorsOf(valid)).toEqual([]);
    expect(
      errorsOf({
        patientId: PATIENT,
        name: 'Dipirona',
        doseAmount: 0.5,
        doseUnit: 'tablet',
        times: ['08:00'],
      }),
    ).toEqual([]);
  });

  it('exige paciente, nome, dose, unidade e horários', () => {
    expect(fieldsOf({})).toEqual([
      'patientId:IS_UUID',
      'name:IS_STRING',
      'doseAmount:IS_NUMBER',
      'doseUnit:IS_IN',
      'times:IS_ARRAY',
    ]);
  });

  it('recusa nome em branco ou longo demais', () => {
    expect(fieldsOf({ ...valid, name: '   ' })).toEqual(['name:MIN_LENGTH']);
    expect(fieldsOf({ ...valid, name: 'a'.repeat(201) })).toEqual([
      'name:MAX_LENGTH',
    ]);
  });

  it('aceita dose com até três casas, maior que zero e até o limite', () => {
    expect(errorsOf({ ...valid, doseAmount: 0.125 })).toEqual([]);
    expect(fieldsOf({ ...valid, doseAmount: 0.1255 })).toEqual([
      'doseAmount:IS_NUMBER',
    ]);
    expect(fieldsOf({ ...valid, doseAmount: '50' })).toEqual([
      'doseAmount:IS_NUMBER',
    ]);
    expect(fieldsOf({ ...valid, doseAmount: 0 })).toEqual([
      'doseAmount:IS_POSITIVE',
    ]);
    expect(fieldsOf({ ...valid, doseAmount: 10_000_000 })).toEqual([
      'doseAmount:MAX',
    ]);
  });

  it('confere unidade e via nas listas da API, com a via opcional', () => {
    expect(fieldsOf({ ...valid, doseUnit: 'colher' })).toEqual([
      'doseUnit:IS_IN',
    ]);
    expect(fieldsOf({ ...valid, route: 'oculta' })).toEqual(['route:IS_IN']);
    expect(errorsOf({ ...valid, route: null })).toEqual([]);
  });

  it('recusa observação em branco ou acima de 2000 caracteres', () => {
    expect(fieldsOf({ ...valid, notes: ' ' })).toEqual(['notes:MIN_LENGTH']);
    expect(fieldsOf({ ...valid, notes: 'a'.repeat(2001) })).toEqual([
      'notes:MAX_LENGTH',
    ]);
  });

  it('aceita início de 2000-01-01 até um ano à frente', () => {
    expect(errorsOf({ ...valid, startDate: '2027-11-12' })).toEqual([]);
    expect(fieldsOf({ ...valid, startDate: '2027-11-13' })).toEqual([
      'startDate:IS_MEDICATION_START_DATE',
    ]);
    expect(fieldsOf({ ...valid, startDate: '1999-12-31' })).toEqual([
      'startDate:IS_MEDICATION_START_DATE',
    ]);
    expect(fieldsOf({ ...valid, startDate: '2026-02-30' })).toEqual([
      'startDate:IS_MEDICATION_START_DATE',
    ]);
  });

  it('recusa fim antes do início, ou antes de hoje quando o início falta', () => {
    expect(errorsOf({ ...valid, endDate: '2026-11-01' })).toEqual([]);
    expect(fieldsOf({ ...valid, endDate: '2026-10-31' })).toEqual([
      'endDate:IS_MEDICATION_END_DATE',
    ]);
    expect(
      fieldsOf({ ...valid, startDate: undefined, endDate: '2026-11-11' }),
    ).toEqual(['endDate:IS_MEDICATION_END_DATE']);
    expect(fieldsOf({ ...valid, endDate: '2101-01-01' })).toEqual([
      'endDate:IS_MEDICATION_END_DATE',
    ]);
  });

  it('aceita intervalo inteiro de 1 a 30 dias', () => {
    expect(errorsOf({ ...valid, intervalDays: 30 })).toEqual([]);
    expect(fieldsOf({ ...valid, intervalDays: 1.5 })).toEqual([
      'intervalDays:IS_INT',
    ]);
    expect(fieldsOf({ ...valid, intervalDays: 0 })).toEqual([
      'intervalDays:MIN',
    ]);
    expect(fieldsOf({ ...valid, intervalDays: 31 })).toEqual([
      'intervalDays:MAX',
    ]);
  });

  it('aceita de 1 a 24 horários HH:mm, sem repetição', () => {
    expect(fieldsOf({ ...valid, times: [] })).toEqual(['times:ARRAY_MIN_SIZE']);
    const many = Array.from(
      { length: 25 },
      (_, index) =>
        `${String(index % 24).padStart(2, '0')}:${index < 24 ? '00' : '30'}`,
    );
    expect(fieldsOf({ ...valid, times: many })).toEqual([
      'times:ARRAY_MAX_SIZE',
    ]);
    expect(fieldsOf({ ...valid, times: ['08:00', ' 08:00'] })).toEqual([
      'times:ARRAY_UNIQUE',
    ]);
    expect(fieldsOf({ ...valid, times: ['24:00'] })).toEqual(['times:MATCHES']);
    expect(fieldsOf({ ...valid, times: ['8:00'] })).toEqual(['times:MATCHES']);
  });

  it('confere o liga e desliga dos lembretes e recusa campo desconhecido', () => {
    expect(fieldsOf({ ...valid, remindersEnabled: 'sim' })).toEqual([
      'remindersEnabled:IS_BOOLEAN',
    ]);
    expect(fieldsOf({ ...valid, condition: 'HAS' })).toEqual([
      'condition:WHITELIST_VALIDATION',
    ]);
  });
});

describe('medicationErrors na edição', () => {
  const partial = { partial: true };

  it('aceita só os campos enviados e o corpo vazio', () => {
    expect(errorsOf({ name: 'Losartana 100 mg' }, partial)).toEqual([]);
    expect(errorsOf({}, partial)).toEqual([]);
  });

  it('recusa nulo nos campos que não o aceitam e limpa via, observação e fim', () => {
    expect(
      fieldsOf(
        {
          name: null,
          doseAmount: null,
          doseUnit: null,
          startDate: null,
          intervalDays: null,
          times: null,
          remindersEnabled: null,
        },
        partial,
      ),
    ).toEqual([
      'name:IS_STRING',
      'doseAmount:IS_NUMBER',
      'doseUnit:IS_IN',
      'startDate:IS_MEDICATION_START_DATE',
      'intervalDays:IS_INT',
      'times:IS_ARRAY',
      'remindersEnabled:IS_BOOLEAN',
    ]);
    expect(
      errorsOf({ route: null, notes: null, endDate: null }, partial),
    ).toEqual([]);
  });

  it('não aceita trocar o paciente', () => {
    expect(fieldsOf({ patientId: PATIENT }, partial)).toEqual([
      'patientId:WHITELIST_VALIDATION',
    ]);
  });

  it('compara o fim com o início só quando os dois vêm no corpo', () => {
    expect(errorsOf({ endDate: '2020-01-01' }, partial)).toEqual([]);
    expect(
      fieldsOf({ startDate: '2026-11-10', endDate: '2026-11-09' }, partial),
    ).toEqual(['endDate:IS_MEDICATION_END_DATE']);
  });
});

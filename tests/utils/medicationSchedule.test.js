// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  daysSinceStart,
  findScheduleConflicts,
  nextOccurrence,
  occurrencesBetween,
} from '../../src/utils/medicationSchedule.js';

// 12/11/2026, 10:00 em Brasília.
const NOW = new Date('2026-11-12T13:00:00.000Z');
const TODAY = '2026-11-12';

function schedule(changes = {}) {
  return {
    startDate: '2026-10-01',
    endDate: null,
    intervalDays: 1,
    times: ['08:00', '20:00'],
    ...changes,
  };
}

function other(id, name, changes) {
  return { id, name, schedule: schedule(changes) };
}

describe('nextOccurrence', () => {
  it('devolve o próximo horário de hoje, convertido de Brasília para UTC', () => {
    expect(nextOccurrence(schedule(), NOW)).toEqual(
      new Date('2026-11-12T23:00:00.000Z'),
    );
  });

  it('é estritamente depois de agora e passa ao dia seguinte depois do último horário', () => {
    expect(
      nextOccurrence(schedule(), new Date('2026-11-12T23:00:00.000Z')),
    ).toEqual(new Date('2026-11-13T11:00:00.000Z'));
  });

  it('conta o intervalo em dias a partir do início', () => {
    // 10/11 é o início; 12/11 é dia de dose, mas as 09:00 já passaram.
    const everyOtherDay = schedule({
      startDate: '2026-11-10',
      intervalDays: 2,
      times: ['09:00'],
    });

    expect(nextOccurrence(everyOtherDay, NOW)).toEqual(
      new Date('2026-11-14T12:00:00.000Z'),
    );
  });

  it('começa no início, quando ele está no futuro', () => {
    expect(nextOccurrence(schedule({ startDate: '2026-12-01' }), NOW)).toEqual(
      new Date('2026-12-01T11:00:00.000Z'),
    );
  });

  it('devolve null quando a agenda acabou', () => {
    expect(nextOccurrence(schedule({ endDate: '2026-11-11' }), NOW)).toBeNull();
    expect(
      nextOccurrence(
        schedule({ endDate: TODAY }),
        new Date('2026-11-12T23:30:00.000Z'),
      ),
    ).toBeNull();
  });
});

describe('occurrencesBetween', () => {
  it('lista, em ordem, os horários depois de `from` e até `to`', () => {
    const from = new Date('2026-11-11T13:00:00.000Z');

    expect(occurrencesBetween(schedule(), from, NOW)).toEqual([
      new Date('2026-11-11T23:00:00.000Z'),
      new Date('2026-11-12T11:00:00.000Z'),
    ]);
  });

  it('pula os dias fora do intervalo e os depois do fim', () => {
    const from = new Date('2026-11-09T13:00:00.000Z');
    const everyOtherDay = schedule({
      startDate: '2026-11-08',
      endDate: '2026-11-11',
      intervalDays: 2,
      times: ['08:00'],
    });

    expect(occurrencesBetween(everyOtherDay, from, NOW)).toEqual([
      new Date('2026-11-10T11:00:00.000Z'),
    ]);
  });
});

describe('findScheduleConflicts', () => {
  it('aponta o horário em comum com outro medicamento num dia em que os dois ocorrem', () => {
    const conflicts = findScheduleConflicts(
      schedule(),
      [other('m1', 'Metformina', { times: ['07:00', '20:00'] })],
      TODAY,
    );

    expect(conflicts).toEqual([
      { medicationId: 'm1', medicationName: 'Metformina', time: '20:00' },
    ]);
  });

  it('não aponta agendas que nunca caem no mesmo dia', () => {
    const conflicts = findScheduleConflicts(
      schedule({ startDate: '2026-11-10', intervalDays: 2 }),
      [other('m1', 'Metformina', { startDate: '2026-11-11', intervalDays: 2 })],
      TODAY,
    );

    expect(conflicts).toEqual([]);
  });

  it('não aponta coincidência que só existiu antes de hoje', () => {
    const conflicts = findScheduleConflicts(
      schedule(),
      [other('m1', 'Amoxicilina', { endDate: '2026-11-11' })],
      TODAY,
    );

    expect(conflicts).toEqual([]);
  });

  it('aponta quando os intervalos diferentes se encontram num dia futuro', () => {
    // A cada 3 dias desde 12/11 e a cada 2 desde 13/11: os dois em 15/11.
    const conflicts = findScheduleConflicts(
      schedule({ startDate: TODAY, intervalDays: 3, times: ['08:00'] }),
      [
        other('m1', 'Sinvastatina', {
          startDate: '2026-11-13',
          intervalDays: 2,
          times: ['08:00'],
        }),
      ],
      TODAY,
    );

    expect(conflicts).toEqual([
      { medicationId: 'm1', medicationName: 'Sinvastatina', time: '08:00' },
    ]);
  });

  it('ordena por horário e depois pelo nome', () => {
    const conflicts = findScheduleConflicts(
      schedule(),
      [
        other('m2', 'Losartana', { times: ['20:00'] }),
        other('m1', 'Anlodipino', { times: ['20:00', '08:00'] }),
      ],
      TODAY,
    );

    expect(
      conflicts.map(({ time, medicationName }) => [time, medicationName]),
    ).toEqual([
      ['08:00', 'Anlodipino'],
      ['20:00', 'Anlodipino'],
      ['20:00', 'Losartana'],
    ]);
  });
});

describe('daysSinceStart', () => {
  it('conta os dias desde o início, pelo dia de Brasília', () => {
    expect(daysSinceStart('2026-10-01', NOW)).toBe(42);
    // 02:00 UTC de 13/11 ainda é 12/11 em Brasília.
    expect(daysSinceStart(TODAY, new Date('2026-11-13T02:00:00.000Z'))).toBe(0);
  });

  it('é negativo para início no futuro', () => {
    expect(daysSinceStart('2026-11-15', NOW)).toBe(-3);
  });
});

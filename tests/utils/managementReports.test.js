// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  alertsReport,
  caregiversReport,
  matchesCondition,
} from '../../src/utils/managementReports.js';

const PERIOD = { from: '2026-11-01', to: '2026-11-03' };

const ana = {
  id: 'p-ana',
  name: 'Ana',
  status: 'active',
  mainCondition: 'Hipertensão arterial',
  secondaryConditions: ['Diabetes mellitus tipo 2'],
};
const bento = {
  id: 'p-bento',
  name: 'Bento',
  status: 'inactive',
  mainCondition: 'DPOC',
  secondaryConditions: [],
};
const caio = {
  id: 'p-caio',
  name: 'Caio',
  status: 'active',
  mainCondition: null,
  secondaryConditions: [],
};
const patients = [ana, bento, caio];

// Brasília é UTC−3: 02:30Z do dia 2 ainda é o dia 1.
function alert(id, patient, source, severity, generatedAt, resolvedAt = null) {
  return {
    id,
    patient: { id: patient.id, name: patient.name },
    source,
    severity,
    status: resolvedAt ? 'resolved' : 'open',
    generatedAt,
    field: source === 'reading' ? { name: 'Glicemia capilar' } : null,
    absence: source === 'absence' ? { form: { name: 'Sinais vitais' } } : null,
    medicationReminder:
      source === 'medication_reminder'
        ? { medication: { name: 'Losartana' } }
        : null,
    resolution: resolvedAt
      ? { resolvedAt, resolvedBy: { id: 'u-rosa', name: 'Rosa' } }
      : null,
  };
}

const alerts = [
  alert(
    'a1',
    ana,
    'reading',
    'critical',
    '2026-11-01T12:00:00.000Z',
    '2026-11-01T14:00:00.000Z',
  ),
  alert('a2', ana, 'absence', 'warning', '2026-11-02T02:30:00.000Z'),
  alert(
    'a3',
    bento,
    'reading',
    'critical',
    '2026-11-02T13:00:00.000Z',
    '2026-11-02T17:00:00.000Z',
  ),
  alert(
    'a4',
    caio,
    'medication_reminder',
    'info',
    '2026-11-03T12:00:00.000Z',
    '2026-11-03T13:00:00.000Z',
  ),
  alert('a5', ana, 'reading', 'critical', '2026-11-03T15:00:00.000Z'),
  // Fora do período: dia 4 em Brasília.
  alert('a6', ana, 'reading', 'critical', '2026-11-04T12:00:00.000Z'),
];

describe('matchesCondition', () => {
  it('procura o trecho na condição principal e nas secundárias, sem diferenciar maiúsculas', () => {
    expect(matchesCondition(ana, 'diab')).toBe(true);
    expect(matchesCondition(ana, 'HIPERT')).toBe(true);
    expect(matchesCondition(bento, 'diab')).toBe(false);
    expect(matchesCondition(caio, 'diab')).toBe(false);
    expect(matchesCondition(caio, null)).toBe(true);
  });
});

describe('alertsReport', () => {
  const report = alertsReport({
    alerts,
    patients,
    period: PERIOD,
    condition: null,
  });

  it('conta os emitidos no período, abertos, resolvidos e intercorrências', () => {
    expect(report.totals).toEqual({
      issued: 5,
      open: 2,
      resolved: 3,
      intercurrences: 3,
    });
  });

  it('separa por origem e por severidade', () => {
    expect(report.bySource).toEqual({
      reading: { total: 3, open: 1, resolved: 2 },
      absence: { total: 1, open: 1, resolved: 0 },
      medicationReminder: { total: 1, open: 0, resolved: 1 },
    });
    expect(report.bySeverity.critical).toEqual({
      total: 3,
      open: 1,
      resolved: 2,
    });
    expect(report.bySeverity.info).toEqual({ total: 1, open: 0, resolved: 1 });
  });

  it('mede o tempo até a resolução em horas, com média e mediana', () => {
    // Resolvidos em 2 h, 4 h e 1 h: média 2,333 e mediana 2.
    expect(report.resolution.overall).toEqual({
      resolved: 3,
      averageHours: 2.333,
      medianHours: 2,
    });
    // Mediana de quantidade par é a média dos dois do meio.
    expect(report.resolution.bySeverity.critical).toEqual({
      resolved: 2,
      averageHours: 3,
      medianHours: 3,
    });
    expect(report.resolution.bySeverity.warning).toEqual({
      resolved: 0,
      averageHours: null,
      medianHours: null,
    });
  });

  it('ordena os pacientes por total, intercorrências e nome', () => {
    expect(
      report.topPatients.map((item) => [
        item.patient.name,
        item.total,
        item.intercurrences,
        item.open,
      ]),
    ).toEqual([
      ['Ana', 3, 2, 2],
      ['Bento', 1, 1, 0],
      ['Caio', 1, 0, 0],
    ]);
    expect(report.topPatients[1].patient.status).toBe('inactive');
  });

  it('traz todos os dias do período, pelo dia de Brasília', () => {
    expect(report.byDay).toEqual([
      { date: '2026-11-01', total: 2, intercurrences: 1 },
      { date: '2026-11-02', total: 1, intercurrences: 1 },
      { date: '2026-11-03', total: 2, intercurrences: 1 },
    ]);
  });

  it('lista as intercorrências da mais recente para a mais antiga, com o assunto', () => {
    expect(report.intercurrences.map((item) => item.id)).toEqual([
      'a5',
      'a3',
      'a1',
    ]);
    expect(report.intercurrences[2]).toEqual({
      id: 'a1',
      generatedAt: '2026-11-01T12:00:00.000Z',
      source: 'reading',
      patient: { id: 'p-ana', name: 'Ana' },
      subject: 'Glicemia capilar',
      status: 'resolved',
      resolvedAt: '2026-11-01T14:00:00.000Z',
      hoursToResolve: 2,
    });
    expect(report.intercurrencesTruncated).toBe(false);
  });

  it('não lista alerta de fora do período', () => {
    expect(report.intercurrences.map((item) => item.id)).not.toContain('a6');
  });

  it('corta a lista em 200 intercorrências e avisa', () => {
    const many = Array.from({ length: 201 }, (_, index) =>
      alert(
        `c${index}`,
        ana,
        'reading',
        'critical',
        '2026-11-02T12:00:00.000Z',
      ),
    );
    const cut = alertsReport({
      alerts: many,
      patients,
      period: PERIOD,
      condition: null,
    });

    expect(cut.intercurrences).toHaveLength(200);
    expect(cut.intercurrencesTruncated).toBe(true);
    expect(cut.totals.intercurrences).toBe(201);
  });

  it('aplica a condição aos pacientes', () => {
    const diabetes = alertsReport({
      alerts,
      patients,
      period: PERIOD,
      condition: 'diab',
    });

    expect(diabetes.totals.issued).toBe(3);
    expect(diabetes.topPatients.map((item) => item.patient.name)).toEqual([
      'Ana',
    ]);
  });

  it('sem alerta no período, zera tudo e mantém os dias', () => {
    const empty = alertsReport({
      alerts: [],
      patients,
      period: PERIOD,
      condition: null,
    });

    expect(empty.totals).toEqual({
      issued: 0,
      open: 0,
      resolved: 0,
      intercurrences: 0,
    });
    expect(empty.byDay.map((day) => day.total)).toEqual([0, 0, 0]);
    expect(empty.topPatients).toEqual([]);
  });
});

describe('caregiversReport', () => {
  const users = [
    {
      id: 'u-rosa',
      name: 'Rosa',
      status: 'active',
      profile: { code: 'caregiver' },
    },
    {
      id: 'u-joao',
      name: 'João',
      status: 'inactive',
      profile: { code: 'caregiver' },
    },
    {
      id: 'u-lia',
      name: 'Lia',
      status: 'active',
      profile: { code: 'caregiver' },
    },
  ];
  const link = (
    userId,
    patientId,
    createdAt,
    revokedAt = null,
    role = 'caregiver',
  ) => ({
    userId,
    patientId,
    role,
    createdAt,
    revokedAt,
  });
  const links = [
    link('u-rosa', 'p-ana', '2026-10-01T12:00:00.000Z'),
    link('u-rosa', 'p-caio', '2026-10-01T12:00:00.000Z'),
    // Revogado antes do período: não conta.
    link(
      'u-lia',
      'p-ana',
      '2026-09-01T12:00:00.000Z',
      '2026-10-20T12:00:00.000Z',
    ),
    // Vínculo de familiar: não é de cuidador.
    link('u-joao', 'p-bento', '2026-10-01T12:00:00.000Z', null, 'family'),
  ];
  const record = (id, userId, patientId, visitedAt, status = 'valid') => ({
    id,
    patientId,
    author: { id: userId },
    visitedAt,
    status,
  });
  const followUps = [
    record('r1', 'u-rosa', 'p-ana', '2026-11-01T12:00:00.000Z'),
    record('r2', 'u-rosa', 'p-ana', '2026-11-02T12:00:00.000Z', 'annulled'),
    // Autor sem vínculo vigente: entra pela autoria.
    record('r3', 'u-joao', 'p-bento', '2026-11-03T12:00:00.000Z'),
  ];
  const report = caregiversReport({
    users,
    links,
    followUps,
    alerts,
    patients,
    period: PERIOD,
    condition: null,
  });

  it('lista quem teve vínculo de cuidador no período ou registrou nele, em ordem de nome', () => {
    expect(report.caregivers.map((row) => row.caregiver.name)).toEqual([
      'João',
      'Rosa',
    ]);
    expect(report.caregivers[0].caregiver).toEqual({
      id: 'u-joao',
      name: 'João',
      status: 'inactive',
      profile: 'caregiver',
    });
  });

  it('conta vínculos, registros, cobertura, ausências e resoluções de cada um', () => {
    expect(report.caregivers[1]).toEqual({
      caregiver: {
        id: 'u-rosa',
        name: 'Rosa',
        status: 'active',
        profile: 'caregiver',
      },
      linkedPatients: 2,
      validFollowUps: 1,
      annulledFollowUps: 1,
      patientsWithFollowUp: 1,
      patientsWithoutFollowUp: 1,
      absenceAlerts: 1,
      resolvedAlerts: 3,
    });
  });

  it('resume o período sem nota nem ranking', () => {
    expect(report.summary).toEqual({
      caregivers: 2,
      linkedPatients: 2,
      validFollowUps: 2,
      annulledFollowUps: 1,
      absenceAlerts: 1,
      resolvedAlerts: 3,
    });
  });

  it('não dá nota nem posição aos cuidadores', () => {
    for (const row of report.caregivers) {
      expect(row).not.toHaveProperty('score');
      expect(row).not.toHaveProperty('rank');
    }
  });

  it('aplica a condição aos pacientes', () => {
    const dpoc = caregiversReport({
      users,
      links,
      followUps,
      alerts,
      patients,
      period: PERIOD,
      condition: 'dpoc',
    });

    expect(dpoc.caregivers.map((row) => row.caregiver.name)).toEqual(['João']);
  });
});

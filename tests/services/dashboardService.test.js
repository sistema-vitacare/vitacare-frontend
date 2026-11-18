// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BASIC_PLAN } from '../../src/data/mocks/plans.js';
import { startDemoSession } from '../../src/services/authService.js';
import {
  getDashboard,
  getDashboardAlerts,
  getDashboardFollowUps,
  getDashboardPatients,
  getDashboardUsers,
} from '../../src/services/dashboardService.js';
import { allAlerts } from '../../src/services/alertStore.js';
import {
  allFollowUps,
  annulFollowUp,
} from '../../src/services/followUpStore.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { changeTerm } from '../../src/services/organizationStore.js';
import { allPatients } from '../../src/services/patientStore.js';
import { allUsers } from '../../src/services/userStore.js';
import { todayInSaoPaulo } from '../../src/utils/format.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

const dayOf = (instant) => todayInSaoPaulo(new Date(instant));
const inPeriod = (instant, { from, to }) =>
  dayOf(instant) >= from && dayOf(instant) <= to;

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('a promessa não falhou');
}

describe('getDashboard', () => {
  it('exige sessão e a permissão do painel, que só o administrador tem', async () => {
    expect((await rejection(getDashboard())).status).toBe(401);

    await startDemoSession('professional');

    expect(await rejection(getDashboard())).toMatchObject({
      status: 403,
      code: 'AUTH_FORBIDDEN',
    });
  });

  it('usa os últimos 30 dias e compara com os 30 anteriores', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboard();

    expect(data.period).toEqual({
      from: '2026-10-12',
      to: '2026-11-10',
      timeZone: 'America/Sao_Paulo',
    });
    expect(data.previousPeriod).toEqual({
      from: '2026-09-12',
      to: '2026-10-11',
    });
    expect(data.followUps.byDay).toHaveLength(30);
  });

  it('conta registros válidos pela data da visita, com a diferença para o período anterior', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboard();
    const valid = allFollowUps(NOW).filter((item) => item.status === 'valid');
    const current = valid.filter((item) =>
      inPeriod(item.visitedAt, data.period),
    );
    const previous = valid.filter((item) =>
      inPeriod(item.visitedAt, data.previousPeriod),
    );

    expect(data.followUps.inPeriod).toBe(current.length);
    expect(data.followUps.inPeriod).toBeGreaterThan(0);
    expect(data.followUps.previousPeriodTotal).toBe(previous.length);
    expect(data.followUps.change).toBe(current.length - previous.length);
    expect(data.followUps.byDay.reduce((sum, day) => sum + day.total, 0)).toBe(
      current.length,
    );
  });

  it('deixa de contar o registro anulado', async () => {
    await startDemoSession('admin');
    const before = (await getDashboard()).data.followUps.inPeriod;
    const [latest] = (await getDashboard()).data.latestFollowUps;

    annulFollowUp(latest.id, {
      reason: 'Teste',
      annulledAt: NOW.toISOString(),
      annulledBy: { id: 'x', name: 'X' },
    });

    expect((await getDashboard()).data.followUps.inPeriod).toBe(before - 1);
  });

  it('conta pacientes e usuários ativos agora e os alertas emitidos e pendentes', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboard();
    const alerts = allAlerts(NOW);

    expect(data.patients.active).toBe(
      allPatients().filter((item) => item.status === 'active').length,
    );
    expect(data.users.active).toBe(
      allUsers().filter((item) => item.status === 'active').length,
    );
    expect(data.alerts.pending).toBe(
      alerts.filter((item) => item.status === 'open').length,
    );
    expect(data.alerts.issuedInPeriod).toBe(
      alerts.filter((item) => inPeriod(item.generatedAt, data.period)).length,
    );
  });

  it('traz até 5 alertas prioritários abertos, por severidade e depois os mais recentes', async () => {
    await startDemoSession('admin');

    const { priorityAlerts } = (await getDashboard()).data;

    expect(priorityAlerts.length).toBeGreaterThan(0);
    expect(priorityAlerts.length).toBeLessThanOrEqual(5);
    const order = priorityAlerts.map(
      (item) =>
        SEVERITY_RANK[item.severity] * 1e13 - Date.parse(item.generatedAt),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const open = new Set(
      allAlerts(NOW)
        .filter((item) => item.status === 'open')
        .map((item) => item.id),
    );
    expect(priorityAlerts.every((item) => open.has(item.id))).toBe(true);
  });

  it('dá ao alerta de valor registrado o campo, o valor, a referência e quem registrou', async () => {
    await startDemoSession('admin');

    const reading = (await getDashboard()).data.priorityAlerts.find(
      (item) => item.source === 'reading',
    );

    expect(reading.patient).toEqual({
      id: expect.any(String),
      name: expect.any(String),
    });
    expect(reading.reading).toMatchObject({
      fieldName: expect.any(String),
      value: expect.any(String),
      operator: expect.stringMatching(/^(gt|gte|lt|lte)$/),
      referenceValue: expect.any(Number),
      author: { id: expect.any(String), name: expect.any(String) },
    });
  });

  it('traz os 5 últimos registros válidos do período, sem as respostas', async () => {
    await startDemoSession('admin');

    const { latestFollowUps, period } = (await getDashboard()).data;

    expect(latestFollowUps).toHaveLength(5);
    const times = latestFollowUps.map((item) => item.visitedAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(
      latestFollowUps.every((item) => inPeriod(item.visitedAt, period)),
    ).toBe(true);
    expect(Object.keys(latestFollowUps[0]).sort()).toEqual([
      'author',
      'form',
      'id',
      'patient',
      'visitedAt',
    ]);
  });

  it('no período sem registro, zera os números do período e avisa, mas mantém as fotos de agora', async () => {
    await startDemoSession('admin');

    const result = await getDashboard({ from: '2025-01-01', to: '2025-01-31' });

    expect(result.data.followUps.inPeriod).toBe(0);
    expect(result.data.followUps.byDay.every((day) => day.total === 0)).toBe(
      true,
    );
    expect(result.data.latestFollowUps).toEqual([]);
    expect(result.data.patients.active).toBeGreaterThan(0);
    expect(result.meta.message).toBe(
      'Nenhum registro de acompanhamento no período selecionado.',
    );
  });

  it('recusa o período inválido com os campos, antes de conferir o plano', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    expect(
      await rejection(getDashboard({ from: '2026-11-05', to: '2026-11-01' })),
    ).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [{ field: 'to', code: 'IS_CALENDAR_DATE' }],
    });
  });

  it('no plano sem o painel, responde 403 com a orientação da API', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    expect(await rejection(getDashboard())).toMatchObject({
      status: 403,
      code: 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE',
      message:
        'O painel operacional faz parte do plano Enterprise. Solicite a mudança de plano para acessá-lo.',
    });
  });
});

describe('leitura', () => {
  it('não muda registros, alertas, pacientes nem usuários', async () => {
    await startDemoSession('admin');
    const before = [
      allFollowUps(NOW),
      allAlerts(NOW),
      allPatients(),
      allUsers(),
    ];

    await getDashboard().catch(() => null);
    await getDashboardAlerts().catch(() => null);

    expect([
      allFollowUps(NOW),
      allAlerts(NOW),
      allPatients(),
      allUsers(),
    ]).toEqual(before);
  });
});

describe('detalhes dos indicadores', () => {
  it('agrupa os pacientes ativos pelo profissional responsável', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboardPatients();
    const patients = allPatients();

    expect(data.active).toBe(
      patients.filter((p) => p.status === 'active').length,
    );
    expect(data.inactive).toBe(
      patients.filter((p) => p.status === 'inactive').length,
    );
    expect(data.byResponsible.reduce((sum, row) => sum + row.active, 0)).toBe(
      data.active,
    );
    const totals = data.byResponsible.map((row) => row.active);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
  });

  it('conta os usuários de cada um dos quatro perfis por situação', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboardUsers();

    expect(data.byProfile.map((row) => row.profile.code)).toEqual([
      'admin',
      'professional',
      'caregiver',
      'family',
    ]);
    expect(data.pending).toBe(1);
    expect(data.byProfile.reduce((sum, row) => sum + row.active, 0)).toBe(
      data.active,
    );
  });

  it('separa os registros do período por formulário e por autor', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboardFollowUps();
    const sum = (rows) => rows.reduce((total, row) => total + row.total, 0);

    expect(sum(data.byForm)).toBe(data.inPeriod);
    expect(sum(data.byAuthor)).toBe(data.inPeriod);
    expect(data.byForm[0]).toEqual({
      form: { id: expect.any(String), name: expect.any(String) },
      total: expect.any(Number),
    });
  });

  it('separa os alertas emitidos por severidade e origem e conta os pendentes', async () => {
    await startDemoSession('admin');

    const { data } = await getDashboardAlerts();
    const total = (counts) =>
      Object.values(counts).reduce((sum, value) => sum + value, 0);

    expect(Object.keys(data.bySeverity)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
    expect(Object.keys(data.bySource)).toEqual([
      'reading',
      'absence',
      'medication_reminder',
    ]);
    expect(total(data.bySeverity)).toBe(data.issuedInPeriod);
    expect(total(data.bySource)).toBe(data.issuedInPeriod);
    expect(total(data.pending.bySeverity)).toBe(data.pending.total);
  });

  it('exigem a mesma permissão e o mesmo plano do resumo', async () => {
    await startDemoSession('caregiver');
    expect((await rejection(getDashboardUsers())).status).toBe(403);
    resetMockState();
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });
    expect((await rejection(getDashboardAlerts())).code).toBe(
      'DASHBOARD_PLAN_FEATURE_UNAVAILABLE',
    );
  });
});

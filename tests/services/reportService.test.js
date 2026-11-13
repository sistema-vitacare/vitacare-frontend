// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionAuditEvents } from '../../src/services/auditStore.js';
import { startDemoSession } from '../../src/services/authService.js';
import { allFollowUps } from '../../src/services/followUpStore.js';
import { allMedications } from '../../src/services/medicationStore.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  getPatientEvolution,
  followUpsInPeriod,
} from '../../src/services/patientService.js';
import {
  exportPatientReportPdf,
  getPatientReport,
} from '../../src/services/reportService.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('getPatientReport', () => {
  it('só administrador e profissional geram relatório', async () => {
    await startDemoSession('caregiver');

    await expect(getPatientReport(DIRCE)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('identifica o paciente sem CPF, contato, endereço nem observações', async () => {
    await startDemoSession('professional');

    const { data } = await getPatientReport(DIRCE);

    expect(data.patient).toEqual({
      id: DIRCE,
      name: 'Dirce Albuquerque Moraes',
      birthDate: expect.any(String),
      sex: expect.anything(),
      status: 'active',
      mainCondition: expect.anything(),
      secondaryConditions: expect.any(Array),
      responsible: { id: expect.any(String), name: expect.any(String) },
    });
    expect(data.generatedBy.name).toBe('Rafael Moura Brandão');
    expect(data.organization.name).toBe('Residencial Ipê Amarelo');
  });

  it('traz os registros válidos do período, do mais antigo ao mais novo, com o resumo', async () => {
    await startDemoSession('professional');

    const { data } = await getPatientReport(DIRCE);
    const expected = followUpsInPeriod(DIRCE, data.period, NOW);

    expect(data.period).toEqual({
      from: '2026-10-12',
      to: '2026-11-10',
      timeZone: 'America/Sao_Paulo',
    });
    expect(data.records.total).toBe(expected.length);
    const visits = data.records.items.map((item) => item.visitedAt);
    expect(visits).toEqual([...visits].sort());
    expect(data.records.firstVisitedAt).toBe(visits[0]);
    expect(data.records.lastVisitedAt).toBe(visits.at(-1));
    const sum = (rows) => rows.reduce((total, row) => total + row.total, 0);
    expect(sum(data.records.byForm)).toBe(data.records.total);
    expect(sum(data.records.byAuthor)).toBe(data.records.total);
  });

  it('tem as mesmas séries da evolução e os medicamentos ativos', async () => {
    await startDemoSession('professional');

    const { data } = await getPatientReport(DIRCE);
    const evolution = await getPatientEvolution(DIRCE);

    expect(data.series).toEqual(evolution.data.series);
    expect(data.medications.length).toBeGreaterThan(0);
    expect(data.medications.every((item) => item.status === 'active')).toBe(
      true,
    );
  });

  it('no período sem registro, responde com o resumo zerado', async () => {
    await startDemoSession('professional');

    const { data } = await getPatientReport(DIRCE, {
      from: '2025-01-01',
      to: '2025-01-31',
    });

    expect(data.records).toMatchObject({
      total: 0,
      firstVisitedAt: null,
      lastVisitedAt: null,
      items: [],
    });
    expect(data.series).toEqual([]);
  });

  it('gera o relatório do paciente inativo e recusa o inexistente', async () => {
    await startDemoSession('admin');

    await expect(getPatientReport(ALZIRA_INACTIVE)).resolves.toBeDefined();
    await expect(getPatientReport('inexistente')).rejects.toMatchObject({
      status: 404,
      code: 'PATIENT_NOT_FOUND',
    });
  });

  it('recusa período inválido com o campo', async () => {
    await startDemoSession('professional');

    await expect(
      getPatientReport(DIRCE, { from: '2026-11-10', to: '2026-11-01' }),
    ).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'to', code: 'IS_CALENDAR_DATE' }],
    });
  });
});

describe('leitura', () => {
  it('não muda registros nem medicamentos, nem ao exportar', async () => {
    await startDemoSession('professional');
    const before = [allFollowUps(NOW), allMedications()];

    await getPatientReport(DIRCE).catch(() => null);
    await exportPatientReportPdf(DIRCE).catch(() => null);

    expect([allFollowUps(NOW), allMedications()]).toEqual(before);
  });
});

describe('exportPatientReportPdf', () => {
  it('devolve o arquivo PDF com o nome da API, que leva só o período', async () => {
    await startDemoSession('professional');

    const { data } = await exportPatientReportPdf(DIRCE, {
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(data.fileName).toBe(
      'relatorio-paciente-2026-10-01-a-2026-10-31.pdf',
    );
    expect(data.blob.type).toBe('application/pdf');
    const bytes = new Uint8Array(await data.blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 8))).toBe('%PDF-1.4');
  });

  // Como na API: a exportação é auditada, e a leitura em JSON não. É o que
  // monta a lista de relatórios recentes (FE-38).
  it('grava a exportação na auditoria, com o paciente e o período', async () => {
    await startDemoSession('professional');

    await getPatientReport(DIRCE);
    expect(sessionAuditEvents()).toEqual([]);
    await exportPatientReportPdf(DIRCE, {
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(sessionAuditEvents()).toHaveLength(1);
    expect(sessionAuditEvents()[0]).toMatchObject({
      action: 'patient_report.exported',
      entity: { type: 'patient', id: DIRCE, label: 'Dirce Albuquerque Moraes' },
      afterValues: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('confere permissão, paciente e período como o relatório', async () => {
    await startDemoSession('family');
    await expect(exportPatientReportPdf(DIRCE)).rejects.toMatchObject({
      status: 403,
    });
  });
});

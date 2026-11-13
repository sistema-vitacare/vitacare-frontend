// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BASIC_PLAN } from '../../src/data/mocks/plans.js';
import { sessionAuditEvents } from '../../src/services/auditStore.js';
import { startDemoSession } from '../../src/services/authService.js';
import {
  exportAlertsReportPdf,
  exportCaregiversReportPdf,
  getAlertsReport,
  getCaregiversReport,
  listManagementReports,
  listRecentReports,
} from '../../src/services/managementReportService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { changeTerm } from '../../src/services/organizationStore.js';
import { exportPatientReportPdf } from '../../src/services/reportService.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('acesso', () => {
  it('só o administrador gera os relatórios gerenciais', async () => {
    await startDemoSession('professional');

    await expect(listManagementReports()).rejects.toMatchObject({
      status: 403,
      code: 'AUTH_FORBIDDEN',
    });
  });

  it('no plano sem o recurso, recusa antes de qualquer conta, com a mensagem da API', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    for (const call of [
      listManagementReports,
      listRecentReports,
      getAlertsReport,
    ]) {
      await expect(call()).rejects.toMatchObject({
        status: 403,
        code: 'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE',
        message:
          'Os relatórios gerenciais fazem parte do plano Enterprise. Solicite a mudança de plano para acessá-los.',
      });
    }
  });

  it('confere a condição e o período antes do plano', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    await expect(getAlertsReport({ condition: '   ' })).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'condition' }],
    });
    await expect(
      getCaregiversReport({ condition: 'x'.repeat(101) }),
    ).rejects.toMatchObject({ status: 422, fields: [{ field: 'condition' }] });
    await expect(
      getAlertsReport({ from: '2026-11-10', to: '2026-11-01' }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('catálogo e recentes', () => {
  it('traz os três tipos da Figura 43 com as exportações já feitas', async () => {
    await startDemoSession('admin');

    const { data } = await listManagementReports();

    expect(data.map((item) => [item.type, item.name, item.formats])).toEqual([
      ['patient_follow_up', 'Acompanhamento individual', ['pdf']],
      ['alerts', 'Alertas e intercorrências', ['pdf']],
      ['caregiver_activity', 'Atividade dos cuidadores', ['pdf']],
    ]);
    expect(data.map((item) => item.exportCount)).toEqual([1, 2, 1]);
  });

  it('monta os recentes pelas exportações, com escopo, período e quem gerou', async () => {
    await startDemoSession('admin');

    const { data, meta } = await listRecentReports();

    expect(meta.pagination.total).toBe(4);
    expect(data[0]).toMatchObject({
      type: 'alerts',
      scope: { kind: 'all', patient: null, condition: null },
      format: 'pdf',
      generatedBy: { name: 'Helena Vasconcelos' },
    });
    const byPatient = data.find((item) => item.type === 'patient_follow_up');
    expect(byPatient.scope).toEqual({
      kind: 'patient',
      patient: { id: DIRCE, name: 'Dirce Albuquerque Moraes' },
      condition: null,
    });
    expect(
      data.find((item) => item.scope.condition === 'Diabetes').scope.kind,
    ).toBe('condition');
  });

  it('a exportação feita na sessão entra no catálogo e no topo dos recentes', async () => {
    await startDemoSession('admin');
    await exportPatientReportPdf(DIRCE, {
      from: '2026-11-01',
      to: '2026-11-10',
    });

    expect((await listManagementReports()).data[0].exportCount).toBe(2);
    expect((await listRecentReports()).data[0]).toMatchObject({
      type: 'patient_follow_up',
      period: { from: '2026-11-01', to: '2026-11-10' },
    });
  });
});

describe('relatório de alertas', () => {
  it('traz período, condição, organização e o conteúdo dos estados', async () => {
    await startDemoSession('admin');

    const { data } = await getAlertsReport({
      from: '2026-10-15',
      to: '2026-11-13',
    });

    expect(data.period).toEqual({
      from: '2026-10-15',
      to: '2026-11-13',
      timeZone: 'America/Sao_Paulo',
    });
    expect(data.condition).toBeNull();
    expect(data.organization).toEqual({
      id: organization.id,
      name: organization.tradeName,
    });
    expect(data.totals.issued).toBeGreaterThan(0);
    expect(data.byDay).toHaveLength(30);
  });

  it('sem alerta no período, responde zerado com a mensagem da API', async () => {
    await startDemoSession('admin');

    const { data, meta } = await getAlertsReport({ condition: 'inexistente' });

    expect(data.totals.issued).toBe(0);
    expect(meta.message).toBe('Nenhum alerta emitido no período selecionado.');
  });

  it('exporta o PDF com o nome da API e grava a exportação', async () => {
    await startDemoSession('admin');

    const { data } = await exportAlertsReportPdf({
      from: '2026-11-01',
      to: '2026-11-10',
      condition: ' diab ',
    });

    expect(data.fileName).toBe('relatorio-alertas-2026-11-01-a-2026-11-10.pdf');
    expect(data.blob.type).toBe('application/pdf');
    expect(sessionAuditEvents()[0]).toMatchObject({
      action: 'management_report.exported',
      entity: { type: 'organization', id: organization.id },
      afterValues: {
        type: 'alerts',
        format: 'pdf',
        from: '2026-11-01',
        to: '2026-11-10',
        condition: 'diab',
      },
    });
  });
});

describe('leitura', () => {
  // Como na API, só a exportação em PDF é auditada.
  it('a leitura dos relatórios não grava exportação', async () => {
    await startDemoSession('admin');

    await getAlertsReport();
    await getCaregiversReport();

    expect(sessionAuditEvents()).toEqual([]);
  });
});

describe('relatório de cuidadores', () => {
  it('lista os cuidadores com as contagens, sem nota', async () => {
    await startDemoSession('admin');

    const { data } = await getCaregiversReport();

    expect(data.caregivers.length).toBeGreaterThan(0);
    expect(data.caregivers.map((row) => row.caregiver.profile)).toContain(
      'caregiver',
    );
    expect(data.summary.caregivers).toBe(data.caregivers.length);
  });

  it('exporta o PDF com o nome da API', async () => {
    await startDemoSession('admin');

    const { data } = await exportCaregiversReportPdf({
      from: '2026-11-01',
      to: '2026-11-10',
    });

    expect(data.fileName).toBe(
      'relatorio-atividade-cuidadores-2026-11-01-a-2026-11-10.pdf',
    );
    expect(sessionAuditEvents()[0].afterValues).toMatchObject({
      type: 'caregiver_activity',
      condition: null,
    });
  });
});

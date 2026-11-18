// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startDemoSession,
  currentViewer,
} from '../../src/services/authService.js';
import {
  recordExport,
  sessionAuditEvents,
} from '../../src/services/auditStore.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('auditStore', () => {
  it('começa sem eventos da sessão', () => {
    expect(sessionAuditEvents()).toEqual([]);
  });

  it('grava a exportação com quem exportou, o rótulo do catálogo e os valores', async () => {
    await startDemoSession('admin');

    recordExport({
      viewer: currentViewer(),
      action: 'management_report.exported',
      entity: { type: 'organization', id: 'org', label: 'Residencial' },
      afterValues: {
        type: 'alerts',
        format: 'pdf',
        from: '2026-10-15',
        to: '2026-11-13',
        condition: null,
      },
    });

    const [event] = sessionAuditEvents();
    expect(event).toMatchObject({
      occurredAt: NOW.toISOString(),
      organization: { id: currentViewer().organization.id },
      actor: {
        type: 'user',
        user: { id: currentViewer().user.id, name: 'Helena Vasconcelos' },
        profile: { code: 'admin' },
      },
      action: 'management_report.exported',
      actionLabel: 'Exportou relatório gerencial',
      severity: 'warning',
      afterValues: { type: 'alerts', from: '2026-10-15', to: '2026-11-13' },
    });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('põe a exportação mais recente primeiro e volta vazio no estado inicial', async () => {
    await startDemoSession('professional');
    const viewer = currentViewer();
    const patient = { type: 'patient', id: 'p1', label: 'Dirce' };
    recordExport({
      viewer,
      action: 'patient_report.exported',
      entity: patient,
      afterValues: { from: 'a', to: 'b' },
    });
    vi.setSystemTime(new Date(NOW.getTime() + 60000));
    recordExport({
      viewer,
      action: 'patient_report.exported',
      entity: patient,
      afterValues: { from: 'c', to: 'd' },
    });

    expect(sessionAuditEvents().map((event) => event.afterValues.from)).toEqual(
      ['c', 'a'],
    );
    resetMockState();
    expect(sessionAuditEvents()).toEqual([]);
  });
});

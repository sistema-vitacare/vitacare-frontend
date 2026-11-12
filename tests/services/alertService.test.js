// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listPatientAlerts } from '../../src/services/alertService.js';
import { startDemoSession } from '../../src/services/authService.js';
import { createFollowUp } from '../../src/services/followUpService.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listPatientAlerts', () => {
  it('lista os alertas do paciente, do mais novo ao mais antigo, com filtro de severidade e situação', async () => {
    await startDemoSession('professional');

    const all = await listPatientAlerts({ patientId: OSVALDO });
    const critical = await listPatientAlerts({
      patientId: OSVALDO,
      severity: 'critical',
    });
    const open = await listPatientAlerts({
      patientId: OSVALDO,
      status: 'open',
    });

    expect(all.data.length).toBeGreaterThan(1);
    expect(all.data.every((alert) => alert.patient.id === OSVALDO)).toBe(true);
    const times = all.data.map((alert) => alert.generatedAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(critical.data.length).toBeGreaterThan(0);
    expect(critical.data.every((alert) => alert.severity === 'critical')).toBe(
      true,
    );
    expect(open.data.every((alert) => alert.status === 'open')).toBe(true);
  });

  it('inclui o alerta gerado pelo registro feito na sessão, com o registro de origem', async () => {
    await startDemoSession('caregiver');
    const { data: followUp } = await createFollowUp({
      patientId: DIRCE,
      formId: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
      formVersionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
      answers: [
        { fieldId: '3c44a6a8-5472-5c65-ad6a-42a6a946740e', value: 172 },
        { fieldId: '9570caa1-28fc-5e06-8327-bac0266a6c63', value: 95 },
      ],
    });

    const { data } = await listPatientAlerts({ patientId: DIRCE });

    expect(data[0]).toMatchObject({
      source: 'reading',
      severity: 'critical',
      status: 'open',
      followUp: { id: followUp.id, status: 'valid' },
      value: '172',
    });
  });

  it('responde 404 para paciente fora do alcance e 403 sem a permissão', async () => {
    await startDemoSession('caregiver');
    await expect(
      listPatientAlerts({ patientId: IOLANDA }),
    ).rejects.toMatchObject({ status: 404, code: 'PATIENT_NOT_FOUND' });

    await startDemoSession('platform_admin');
    await expect(listPatientAlerts({ patientId: DIRCE })).rejects.toMatchObject(
      { status: 403 },
    );
  });
});

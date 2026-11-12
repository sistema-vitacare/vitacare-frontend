// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAlert,
  listPatientAlerts,
  resolveAlert,
} from '../../src/services/alertService.js';
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

async function firstOpenAlert(patientId) {
  const { data } = await listPatientAlerts({ patientId, status: 'open' });
  return data[0];
}

describe('getAlert', () => {
  it('devolve o alerta de um paciente ao alcance, de qualquer origem', async () => {
    await startDemoSession('professional');
    const { data: list } = await listPatientAlerts({ patientId: OSVALDO });

    const { data } = await getAlert(list[0].id);

    expect(data).toEqual(list[0]);
  });

  it('responde 404 para alerta inexistente ou de paciente fora do alcance, e 403 sem a permissão', async () => {
    await startDemoSession('professional');
    const outside = await firstOpenAlert(IOLANDA);

    await startDemoSession('caregiver');
    await expect(getAlert(outside.id)).rejects.toMatchObject({
      status: 404,
      code: 'ALERT_NOT_FOUND',
    });
    await expect(getAlert('nao-existe')).rejects.toMatchObject({
      status: 404,
    });

    await startDemoSession('platform_admin');
    await expect(getAlert(outside.id)).rejects.toMatchObject({ status: 403 });
  });
});

describe('resolveAlert', () => {
  it('resolve para todos, com quem resolveu e quando, e o alerta passa aos resolvidos', async () => {
    await startDemoSession('caregiver');
    const open = await firstOpenAlert(OSVALDO);

    const { data } = await resolveAlert(open.id);

    expect(data).toMatchObject({
      id: open.id,
      status: 'resolved',
      resolution: {
        resolvedAt: NOW.toISOString(),
        resolvedBy: { name: 'Rosângela Prado' },
      },
    });
    await startDemoSession('professional');
    const resolved = await listPatientAlerts({
      patientId: OSVALDO,
      status: 'resolved',
    });
    expect(resolved.data.map((alert) => alert.id)).toContain(open.id);
  });

  it('responde 409 ao alerta já resolvido, por qualquer pessoa', async () => {
    await startDemoSession('professional');
    const open = await firstOpenAlert(OSVALDO);
    await resolveAlert(open.id);

    await startDemoSession('caregiver');
    await expect(resolveAlert(open.id)).rejects.toMatchObject({
      status: 409,
      code: 'ALERT_ALREADY_RESOLVED',
    });
  });

  it('não deixa o familiar resolver e responde 404 fora do alcance', async () => {
    await startDemoSession('professional');
    const dirce = await firstOpenAlert(DIRCE);
    const iolanda = await firstOpenAlert(IOLANDA);

    await startDemoSession('family');
    await expect(resolveAlert(dirce.id)).rejects.toMatchObject({
      status: 403,
    });
    await startDemoSession('caregiver');
    await expect(resolveAlert(iolanda.id)).rejects.toMatchObject({
      status: 404,
      code: 'ALERT_NOT_FOUND',
    });
  });
});

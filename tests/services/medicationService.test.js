// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDemoSession } from '../../src/services/authService.js';
import {
  createMedication,
  deactivateMedication,
  listMedications,
  reactivateMedication,
  updateMedication,
} from '../../src/services/medicationService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { deactivatePatient } from '../../src/services/patientService.js';

// 10/11/2026, 12:00 em Brasília.
const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const LOSARTANA = '2cfba5e6-92b2-5822-8f2b-4220431410a5';
const HIDROCLOROTIAZIDA = '8f62d81f-d9dc-5bcf-baa0-ac5718ffac50';
const SINVASTATINA = '4a7e2f1c-8b3d-5e6f-9a0b-1c2d3e4f5a6b';

const names = (response) => response.data.map((item) => item.name);

const newMedication = {
  patientId: DIRCE,
  name: '  Dipirona 500 mg ',
  doseAmount: 0.5,
  doseUnit: 'tablet',
  times: ['18:00', '13:00'],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listMedications', () => {
  it('lista os medicamentos do paciente, ativos primeiro e por nome, com o próximo horário e o horário coincidente', async () => {
    await startDemoSession('professional');

    const response = await listMedications({ patientId: DIRCE });

    expect(names(response)).toEqual([
      'Ácido acetilsalicílico 100 mg',
      'Hidroclorotiazida 25 mg',
      'Losartana potássica 50 mg',
      'Sinvastatina 20 mg',
    ]);
    expect(response.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 4,
      totalPages: 1,
    });
    const losartana = response.data.find((item) => item.id === LOSARTANA);
    expect(losartana.nextScheduledAt).toBe('2026-11-10T23:00:00.000Z');
    expect(losartana.scheduleConflicts).toEqual([
      {
        medicationId: HIDROCLOROTIAZIDA,
        medicationName: 'Hidroclorotiazida 25 mg',
        time: '08:00',
      },
    ]);
    const inactive = response.data.find((item) => item.id === SINVASTATINA);
    expect(inactive).toMatchObject({
      status: 'inactive',
      nextScheduledAt: null,
      scheduleConflicts: [],
    });
  });

  it('filtra pela situação e deixa o cuidador ler os pacientes vinculados', async () => {
    await startDemoSession('caregiver');

    const inactive = await listMedications({
      patientId: DIRCE,
      status: 'inactive',
    });

    expect(names(inactive)).toEqual(['Sinvastatina 20 mg']);
  });

  it('responde 404 fora do alcance, 403 sem a permissão e 422 sem o paciente', async () => {
    await startDemoSession('caregiver');
    await expect(listMedications({ patientId: IOLANDA })).rejects.toMatchObject(
      { status: 404, code: 'PATIENT_NOT_FOUND' },
    );
    await expect(listMedications({})).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'patientId', code: 'IS_UUID' }],
    });

    await startDemoSession('platform_admin');
    await expect(listMedications({ patientId: DIRCE })).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('createMedication', () => {
  it('cadastra com os padrões da API, horários em ordem e o aviso de horário coincidente', async () => {
    await startDemoSession('professional');

    const { data } = await createMedication(newMedication);

    expect(data).toMatchObject({
      patientId: DIRCE,
      name: 'Dipirona 500 mg',
      doseAmount: 0.5,
      route: null,
      notes: null,
      schedule: {
        startDate: '2026-11-10',
        endDate: null,
        intervalDays: 1,
        times: ['13:00', '18:00'],
        timeZone: 'America/Sao_Paulo',
      },
      remindersEnabled: false,
      nextScheduledAt: '2026-11-10T16:00:00.000Z',
      scheduleConflicts: [
        expect.objectContaining({
          medicationName: 'Ácido acetilsalicílico 100 mg',
          time: '13:00',
        }),
      ],
      status: 'active',
      createdBy: { name: 'Rafael Moura Brandão' },
      createdAt: NOW.toISOString(),
      deactivatedAt: null,
    });
    expect(names(await listMedications({ patientId: DIRCE }))).toContain(
      'Dipirona 500 mg',
    );
  });

  it('recusa campos inválidos com 422 e não grava', async () => {
    await startDemoSession('professional');

    await expect(
      createMedication({ ...newMedication, doseAmount: 0, times: [] }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [
        { field: 'doseAmount', code: 'IS_POSITIVE' },
        { field: 'times', code: 'ARRAY_MIN_SIZE' },
      ],
    });
    expect((await listMedications({ patientId: DIRCE })).data).toHaveLength(4);
  });

  it('não cadastra para paciente inativo ou inexistente, nem pelo cuidador', async () => {
    await startDemoSession('professional');
    await expect(
      createMedication({ ...newMedication, patientId: ALZIRA_INACTIVE }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'MEDICATION_PATIENT_INACTIVE',
    });
    await expect(
      createMedication({
        ...newMedication,
        patientId: '00000000-0000-5000-8000-000000000000',
      }),
    ).rejects.toMatchObject({ status: 404, code: 'PATIENT_NOT_FOUND' });

    await startDemoSession('caregiver');
    await expect(createMedication(newMedication)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('updateMedication', () => {
  it('muda só os campos enviados e recalcula a coincidência', async () => {
    await startDemoSession('professional');

    const { data } = await updateMedication(HIDROCLOROTIAZIDA, {
      name: 'Hidroclorotiazida 12,5 mg',
      times: ['09:00'],
    });

    expect(data).toMatchObject({
      name: 'Hidroclorotiazida 12,5 mg',
      doseUnit: 'tablet',
      schedule: { startDate: '2026-10-01', times: ['09:00'] },
      scheduleConflicts: [],
      updatedAt: NOW.toISOString(),
    });
    const list = await listMedications({ patientId: DIRCE });
    expect(
      list.data.find((item) => item.id === LOSARTANA).scheduleConflicts,
    ).toEqual([]);
  });

  it('recusa edição sem mudança e fim antes do início gravado', async () => {
    await startDemoSession('professional');

    await expect(
      updateMedication(LOSARTANA, { times: ['20:00', '08:00'] }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'MEDICATION_NOTHING_TO_UPDATE',
    });
    await expect(updateMedication(LOSARTANA, {})).rejects.toMatchObject({
      code: 'MEDICATION_NOTHING_TO_UPDATE',
    });
    await expect(
      updateMedication(LOSARTANA, { endDate: '2026-09-30' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'MEDICATION_INVALID_PERIOD',
      fields: [{ field: 'endDate', code: 'BEFORE_START' }],
    });
  });

  it('não edita medicamento inativo nem de paciente inativo', async () => {
    await startDemoSession('professional');
    await expect(
      updateMedication(SINVASTATINA, { name: 'Sinvastatina 40 mg' }),
    ).rejects.toMatchObject({ status: 409, code: 'MEDICATION_INACTIVE' });

    await startDemoSession('admin');
    await deactivatePatient(DIRCE);
    await expect(
      updateMedication(LOSARTANA, { name: 'Losartana 100 mg' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'MEDICATION_PATIENT_INACTIVE',
    });
  });

  it('responde 404 para medicamento fora do alcance e 403 ao familiar', async () => {
    await startDemoSession('family');
    await expect(
      updateMedication(LOSARTANA, { name: 'Outro' }),
    ).rejects.toMatchObject({ status: 403 });

    await startDemoSession('professional');
    await expect(
      updateMedication('nao-existe', { name: 'Outro' }),
    ).rejects.toMatchObject({ status: 404, code: 'MEDICATION_NOT_FOUND' });
  });
});

describe('deactivateMedication e reactivateMedication', () => {
  it('inativa preservando o medicamento, tira o horário coincidente do outro e reativa a mesma agenda', async () => {
    await startDemoSession('professional');

    const { data: inactive } = await deactivateMedication(HIDROCLOROTIAZIDA);

    expect(inactive).toMatchObject({
      status: 'inactive',
      deactivatedAt: NOW.toISOString(),
      nextScheduledAt: null,
      scheduleConflicts: [],
      schedule: { times: ['08:00'] },
    });
    let list = await listMedications({ patientId: DIRCE });
    expect(
      list.data.find((item) => item.id === LOSARTANA).scheduleConflicts,
    ).toEqual([]);

    const { data: active } = await reactivateMedication(HIDROCLOROTIAZIDA);

    expect(active).toMatchObject({ status: 'active', deactivatedAt: null });
    list = await listMedications({ patientId: DIRCE });
    expect(
      list.data.find((item) => item.id === LOSARTANA).scheduleConflicts,
    ).toHaveLength(1);
  });

  it('responde 409 ao repetir a inativação ou a reativação', async () => {
    await startDemoSession('professional');

    await expect(deactivateMedication(SINVASTATINA)).rejects.toMatchObject({
      status: 409,
      code: 'MEDICATION_ALREADY_INACTIVE',
    });
    await expect(reactivateMedication(LOSARTANA)).rejects.toMatchObject({
      status: 409,
      code: 'MEDICATION_ALREADY_ACTIVE',
    });
  });

  it('com o paciente inativo, inativa mas não reativa', async () => {
    await startDemoSession('admin');
    await deactivatePatient(DIRCE);

    await expect(deactivateMedication(LOSARTANA)).resolves.toMatchObject({
      data: { status: 'inactive' },
    });
    await expect(reactivateMedication(SINVASTATINA)).rejects.toMatchObject({
      status: 409,
      code: 'MEDICATION_PATIENT_INACTIVE',
    });
  });

  it('não deixa o cuidador inativar', async () => {
    await startDemoSession('caregiver');

    await expect(deactivateMedication(LOSARTANA)).rejects.toMatchObject({
      status: 403,
    });
  });
});

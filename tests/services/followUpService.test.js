// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDemoSession } from '../../src/services/authService.js';
import { listFollowUps } from '../../src/services/followUpService.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const DAILY_FORM = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listFollowUps', () => {
  it('lista os registros do paciente, do mais recente ao mais antigo, com os anulados', async () => {
    await startDemoSession('professional');

    const { data, meta } = await listFollowUps({ patientId: DIRCE });

    expect(meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 28,
      totalPages: 2,
    });
    expect(data[0].visitedAt).toBe('2026-11-09T12:30:00.000Z');
    expect(data[0].visitedAt > data[1].visitedAt).toBe(true);
    const all = await listFollowUps({ patientId: DIRCE, limit: 100 });
    expect(all.data.filter((item) => item.status === 'annulled')).toHaveLength(
      1,
    );
  });

  it('esconde da familiar o registro anulado', async () => {
    await startDemoSession('family');

    const { meta } = await listFollowUps({ patientId: DIRCE });
    const annulled = await listFollowUps({
      patientId: DIRCE,
      status: 'annulled',
    });

    expect(meta.pagination.total).toBe(27);
    expect(annulled.data).toEqual([]);
  });

  it('filtra por situação, formulário, autor e período', async () => {
    await startDemoSession('professional');

    const annulled = await listFollowUps({
      patientId: DIRCE,
      status: 'annulled',
    });
    const daily = await listFollowUps({ patientId: DIRCE, formId: DAILY_FORM });
    const byAuthor = await listFollowUps({
      patientId: DIRCE,
      authorUserId: '485ba72b-e202-54ed-9f38-2294a18e1d29',
    });
    const lastWeek = await listFollowUps({
      patientId: DIRCE,
      from: '2026-11-03',
      to: '2026-11-09',
    });

    expect(annulled.meta.pagination.total).toBe(1);
    expect(daily.meta.pagination.total).toBe(14);
    expect(byAuthor.data).toEqual([]);
    expect(lastWeek.data.map((item) => item.visitedAt.slice(0, 10))).toEqual([
      '2026-11-09',
      '2026-11-08',
      '2026-11-06',
      '2026-11-05',
      '2026-11-03',
    ]);
  });

  it('responde 404 para paciente fora do alcance', async () => {
    await startDemoSession('family');

    await expect(listFollowUps({ patientId: OSVALDO })).rejects.toMatchObject({
      status: 404,
    });
  });
});

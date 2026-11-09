// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { permissionsFor } from '../../src/constants/permissions.js';
import {
  DEMO_PROFILES,
  endSession,
  startDemoSession,
} from '../../src/services/authService.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('authService', () => {
  it('oferece um usuário de demonstração para cada um dos cinco perfis', async () => {
    expect(DEMO_PROFILES).toHaveLength(5);

    for (const profile of DEMO_PROFILES) {
      const { data } = await startDemoSession(profile);
      expect(data.user.profile.code).toBe(profile);
    }
  });

  it('inicia a sessão do cuidador com usuário, organização e permissões do perfil', async () => {
    const { data } = await startDemoSession('caregiver');

    expect(data.state).toBe('authenticated');
    expect(data.user.profile.code).toBe('caregiver');
    expect(data.organization.code).toBe('ipe-amarelo');
    expect(data.permissions).toEqual(permissionsFor('caregiver'));
  });

  it('inicia a sessão do administrador da plataforma na organização de plataforma', async () => {
    const { data } = await startDemoSession('platform_admin');

    expect(data.organization.kind).toBe('platform');
    expect(data.permissions).toContain('platform_organizations:read');
  });

  it('define o fim da sessão 12 horas depois do início, como a API', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T12:00:00.000Z'));

    const { data } = await startDemoSession('admin');

    expect(data.expiresAt).toBe('2026-11-10T00:00:00.000Z');
  });

  it('recusa perfil sem usuário de demonstração', async () => {
    await expect(startDemoSession('visitante')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('encerra a sessão sem erro', async () => {
    await expect(endSession()).resolves.toEqual(
      expect.objectContaining({ data: null }),
    );
  });
});

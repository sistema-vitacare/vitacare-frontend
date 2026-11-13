// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  permissionsFor,
} from '../../src/constants/permissions.js';

const profiles = [
  'platform_admin',
  'admin',
  'professional',
  'caregiver',
  'family',
];

describe('matriz de permissões', () => {
  it('tem a mesma quantidade de permissões por perfil que a matriz do backend', () => {
    const counts = Object.fromEntries(
      profiles.map((profile) => [profile, permissionsFor(profile).length]),
    );

    expect(counts).toEqual({
      platform_admin: 10,
      admin: 36,
      professional: 21,
      caregiver: 8,
      family: 6,
    });
  });

  it('tem no catálogo os mesmos 41 códigos do backend, inclusive o do próprio cadastro e o dos relatórios gerenciais', () => {
    const catalog = Object.values(PERMISSIONS);

    expect(catalog).toHaveLength(41);
    expect(catalog).toContain('alerts:resolve');
    expect(catalog).toContain('profile:manage');
    expect(catalog).toContain('management_reports:generate');
  });

  it('deixa todos os perfis, inclusive a plataforma, cuidar do próprio cadastro', () => {
    const holders = profiles.filter((profile) =>
      permissionsFor(profile).includes('profile:manage'),
    );

    expect(holders).toEqual(profiles);
  });

  it('deixa gerar relatório gerencial só o administrador da organização', () => {
    const holders = profiles.filter((profile) =>
      permissionsFor(profile).includes('management_reports:generate'),
    );

    expect(holders).toEqual(['admin']);
  });

  it('deixa resolver alertas só quem cuida: profissional, cuidador e, por herança, administrador', () => {
    const canResolve = profiles.filter((profile) =>
      permissionsFor(profile).includes('alerts:resolve'),
    );

    expect(canResolve).toEqual(['admin', 'professional', 'caregiver']);
  });

  it('deixa consultar e exportar a auditoria só o administrador e o administrador da plataforma', () => {
    const holders = (permission) =>
      profiles.filter((profile) =>
        permissionsFor(profile).includes(permission),
      );

    expect(holders('audit_events:read')).toEqual(['platform_admin', 'admin']);
    expect(holders('audit_events:export')).toEqual(['platform_admin', 'admin']);
  });

  it('dá ao administrador todas as permissões do profissional de saúde', () => {
    const admin = new Set(permissionsFor('admin'));
    const missing = permissionsFor('professional').filter((p) => !admin.has(p));

    expect(permissionsFor('professional')).not.toHaveLength(0);
    expect(missing).toEqual([]);
  });

  it('deixa só o cuidador registrar acompanhamento', () => {
    const canRecord = profiles.filter((profile) =>
      permissionsFor(profile).includes('follow_ups:create'),
    );

    expect(canRecord).toEqual(['caregiver']);
  });

  it('dá ao familiar só leitura dos dados de cuidado, além do próprio cadastro', () => {
    // `profile:manage` só alcança o cadastro de quem está na sessão.
    const care = permissionsFor('family').filter(
      (permission) => permission !== 'profile:manage',
    );

    expect(care).toHaveLength(5);
    expect(care.every((permission) => permission.endsWith(':read'))).toBe(true);
  });

  it('reserva as permissões platform_* ao administrador da plataforma', () => {
    const holders = profiles.filter((profile) =>
      permissionsFor(profile).some((p) => p.startsWith('platform_')),
    );

    expect(holders).toEqual(['platform_admin']);
  });

  it('não dá permissão a perfil desconhecido', () => {
    expect(permissionsFor('visitante')).toEqual([]);
  });
});

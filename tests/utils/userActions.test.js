// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PERMISSIONS as P } from '../../src/constants/permissions.js';
import { userActions, userSituation } from '../../src/utils/userActions.js';

const VIEWER = 'administrador';
const everything = () => true;
const nothing = () => false;
const only =
  (...granted) =>
  (permission) =>
    granted.includes(permission);

const active = { id: 'ativo', status: 'active', invitation: null };
const inactive = { id: 'inativo', status: 'inactive', invitation: null };
const invited = (channel, status) => ({
  id: 'convidado',
  status: 'pending',
  invitation: { channel, status, expiresAt: '2026-11-14T15:00:00.000Z' },
});

describe('userSituation', () => {
  it('separa o convidado pela situação do convite', () => {
    expect(userSituation(active)).toBe('active');
    expect(userSituation(inactive)).toBe('inactive');
    expect(userSituation(invited('temporary_password', 'pending'))).toBe(
      'invited',
    );
    expect(userSituation(invited('temporary_password', 'expired'))).toBe(
      'expired',
    );
    expect(userSituation(invited('email', 'invalidated'))).toBe('invalidated');
  });
});

describe('userActions', () => {
  it('sem permissão, não há ação', () => {
    expect(userActions(active, { viewerId: VIEWER, can: nothing })).toEqual([]);
  });

  it('ativo: editar, alterar perfil, gerar senha provisória e inativar', () => {
    expect(userActions(active, { viewerId: VIEWER, can: everything })).toEqual([
      'edit',
      'changeProfile',
      'temporaryPassword',
      'deactivate',
    ]);
  });

  it('inativo: editar, alterar perfil e reativar', () => {
    expect(
      userActions(inactive, { viewerId: VIEWER, can: everything }),
    ).toEqual(['edit', 'changeProfile', 'reactivate']);
  });

  it('convidado por senha: reemitir convite, sem a reemissão por senha', () => {
    for (const status of ['pending', 'expired']) {
      expect(
        userActions(invited('temporary_password', status), {
          viewerId: VIEWER,
          can: everything,
        }),
      ).toEqual(['edit', 'changeProfile', 'reissueInvitation', 'deactivate']);
    }
  });

  it('convidado por link: reemitir também com senha provisória', () => {
    expect(
      userActions(invited('email', 'invalidated'), {
        viewerId: VIEWER,
        can: everything,
      }),
    ).toEqual([
      'edit',
      'changeProfile',
      'reissueInvitation',
      'reissueWithPassword',
      'deactivate',
    ]);
  });

  it('a própria conta só se edita', () => {
    expect(
      userActions(
        { ...active, id: VIEWER },
        { viewerId: VIEWER, can: everything },
      ),
    ).toEqual(['edit']);
  });

  it('cada ação segue a própria permissão', () => {
    const viewerId = VIEWER;
    expect(
      userActions(active, { viewerId, can: only(P.USERS_UPDATE) }),
    ).toEqual(['edit']);
    expect(
      userActions(active, { viewerId, can: only(P.USERS_CHANGE_PROFILE) }),
    ).toEqual(['changeProfile']);
    expect(
      userActions(active, { viewerId, can: only(P.USERS_RESET_PASSWORD) }),
    ).toEqual(['temporaryPassword']);
    expect(
      userActions(inactive, { viewerId, can: only(P.USERS_CHANGE_STATUS) }),
    ).toEqual(['reactivate']);
    expect(
      userActions(invited('email', 'pending'), {
        viewerId,
        can: only(P.USERS_CREATE),
      }),
    ).toEqual(['reissueInvitation', 'reissueWithPassword']);
  });
});

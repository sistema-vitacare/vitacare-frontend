import { describe, expect, it } from 'vitest';
import {
  acceptInvitation,
  inspectInvitation,
} from '../../src/services/invitationService.js';
import { apiStub } from '../support/apiStub.js';

describe('invitationService', () => {
  it('consulta o convite com o token no corpo, sem token de sessão', async () => {
    apiStub().use({
      'POST /auth/invitations/inspect': () => ({
        data: { user: { name: 'Ana' } },
        meta: {},
      }),
    });

    const { data } = await inspectInvitation('token-do-convite');

    expect(data.user.name).toBe('Ana');
    expect(apiStub().last('POST /auth/invitations/inspect')).toMatchObject({
      token: null,
      body: { token: 'token-do-convite' },
    });
  });

  it('aceita o convite com o token e a senha escolhida', async () => {
    apiStub().use({
      'POST /auth/invitations/accept': () => ({
        data: { organizationCode: 'ipe-amarelo', email: 'ana@exemplo.test' },
        meta: { message: 'Senha cadastrada.' },
      }),
    });

    const { data, meta } = await acceptInvitation({
      token: 'token-do-convite',
      newPassword: 'senha-da-ana',
    });

    expect(data.email).toBe('ana@exemplo.test');
    expect(meta.message).toBe('Senha cadastrada.');
    expect(apiStub().last('POST /auth/invitations/accept')).toMatchObject({
      token: null,
      body: { token: 'token-do-convite', newPassword: 'senha-da-ana' },
    });
  });
});

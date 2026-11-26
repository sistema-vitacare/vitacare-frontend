import { afterEach, describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  changeUserProfile,
  createUser,
  deactivateUser,
  getUser,
  issueTemporaryPassword,
  listUsers,
  reactivateUser,
  reissueInvitation,
  updateUser,
} from '../../src/services/userService.js';
import { apiFailure, apiPage, apiStub, reply } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';
import {
  ANA,
  apiUser,
  emailInvitation,
  passwordInvitation,
} from '../support/fixtures/users.js';

const TOKEN = `token-${demoUser('admin').id}`;
const FORGED = '../organizations/me';

async function signIn() {
  await login(credentialsFor('admin'));
}

afterEach(() => {
  resetMockState();
});

describe('userService', () => {
  it('lista e consulta pela API, com os filtros na query, o id escapado e o token da sessão', async () => {
    await signIn();
    const user = apiUser(ANA);
    apiStub().use({
      'GET /users': () => apiPage([user]),
      'GET /users/:userId': ({ params }) => ({
        data: { ...user, id: params.userId },
        meta: {},
      }),
    });

    const list = await listUsers({
      status: 'pending',
      profileCode: 'caregiver',
      search: 'ana',
      page: 2,
      limit: 20,
    });
    const detail = await getUser(FORGED);

    expect(list.data).toEqual([user]);
    expect(apiStub().last('GET /users')).toMatchObject({
      query: {
        status: 'pending',
        profileCode: 'caregiver',
        search: 'ana',
        page: '2',
        limit: '20',
      },
      token: TOKEN,
    });
    expect(detail.data.id).toBe(FORGED);
  });

  it('cadastra com o corpo da tela e devolve a senha ou a mensagem do envio como a API manda', async () => {
    await signIn();
    const body = {
      name: 'Ana Exemplo',
      email: 'ana@example.test',
      cpf: '529.982.247-25',
      profileCode: 'caregiver',
    };
    const created = {
      channel: 'temporary_password',
      temporaryPassword: 'X7hK2mPq9RtV4wYz8NcB',
      expiresAt: '2026-11-04T12:30:00.000Z',
      user: apiUser({ ...ANA, invitation: passwordInvitation() }),
    };
    apiStub().use({
      'POST /users': () => reply(201, { data: created, meta: {} }),
    });

    const { data } = await createUser(body);

    expect(data).toEqual(created);
    expect(apiStub().last('POST /users').body).toEqual(body);
  });

  it('edita os dados e troca o perfil pelas rotas do usuário', async () => {
    await signIn();
    apiStub().use({
      'PATCH /users/:userId': () => ({ data: apiUser(ANA), meta: {} }),
      'PATCH /users/:userId/profile': () => ({
        data: { id: ANA.id, name: ANA.name, profile: { code: 'family' } },
        meta: {},
      }),
    });

    await updateUser(ANA.id, { phone: null });
    await changeUserProfile(ANA.id, { profileCode: 'family' });

    expect(apiStub().last('PATCH /users/:userId')).toMatchObject({
      params: { userId: ANA.id },
      body: { phone: null },
    });
    expect(apiStub().last('PATCH /users/:userId/profile')).toMatchObject({
      params: { userId: ANA.id },
      body: { profileCode: 'family' },
    });
  });

  it('inativa e reativa pelas rotas do usuário, sem corpo', async () => {
    await signIn();
    apiStub().use({
      'POST /users/:userId/deactivate': () => ({
        data: apiUser({ ...ANA, status: 'inactive' }),
        meta: {},
      }),
      'POST /users/:userId/reactivate': () => ({
        data: apiUser(ANA),
        meta: {},
      }),
    });

    await deactivateUser(ANA.id);
    await reactivateUser(ANA.id);

    expect(apiStub().last('POST /users/:userId/deactivate')).toMatchObject({
      params: { userId: ANA.id },
      body: undefined,
    });
    expect(apiStub().last('POST /users/:userId/reactivate')).toMatchObject({
      params: { userId: ANA.id },
      body: undefined,
    });
  });

  it('reemite o convite sem corpo, no canal do servidor, ou com o canal pedido', async () => {
    await signIn();
    const sent = {
      channel: 'email',
      expiresAt: emailInvitation().expiresAt,
      delivery: { status: 'sent' },
    };
    const message =
      'Convite enviado ao e-mail do usuário. O link vale até 06/11/2026 às 09:30 (horário de Brasília).';
    apiStub().use({
      'POST /users/:userId/invitation': () =>
        reply(201, { data: sent, meta: { message } }),
    });

    const byServer = await reissueInvitation(ANA.id);
    const serverRequest = apiStub().last('POST /users/:userId/invitation');
    await reissueInvitation(ANA.id, { channel: 'temporary_password' });

    expect(byServer).toMatchObject({ data: sent, meta: { message } });
    expect(serverRequest.body).toBeUndefined();
    expect(apiStub().last('POST /users/:userId/invitation').body).toEqual({
      channel: 'temporary_password',
    });
  });

  it('gera a senha temporária pela rota de autenticação', async () => {
    await signIn();
    const issued = {
      temporaryPassword: 'Wq3Lm8Xz2KpR7tYv4NbC',
      expiresAt: '2026-11-04T12:30:00.000Z',
    };
    apiStub().use({
      'POST /auth/users/:userId/temporary-password': () =>
        reply(201, { data: issued, meta: {} }),
    });

    const { data } = await issueTemporaryPassword(ANA.id);

    expect(data).toEqual(issued);
    expect(
      apiStub().last('POST /auth/users/:userId/temporary-password'),
    ).toMatchObject({ params: { userId: ANA.id }, token: TOKEN });
  });

  it('repassa o erro da API, com a mensagem e os campos', async () => {
    await signIn();
    apiStub().use({
      'POST /users': () =>
        apiFailure(
          409,
          'USER_DUPLICATE_EMAIL',
          'Já existe um usuário com este e-mail na organização. Se ele estiver inativo, reative-o.',
          [{ field: 'email', code: 'DUPLICATE' }],
        ),
    });

    await expect(
      createUser({ name: 'Ana', email: 'ana@example.test' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'USER_DUPLICATE_EMAIL',
      fields: [{ field: 'email', code: 'DUPLICATE' }],
    });
  });
});

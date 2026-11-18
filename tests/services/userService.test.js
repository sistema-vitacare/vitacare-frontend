// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BASIC_PLAN } from '../../src/data/mocks/plans.js';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { changeTerm } from '../../src/services/organizationStore.js';
import { allLinks } from '../../src/services/patientStore.js';
import {
  changeUserProfile,
  createUser,
  deactivateUser,
  getUser,
  issueTemporaryPassword,
  listUsers,
  reactivateUser,
  reissueInvitation,
  setInvitationEmailEnabled,
  updateUser,
} from '../../src/services/userService.js';
import { findUser } from '../../src/services/userStore.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const HELENA = 'f43fdabb-62fc-569d-aa6b-02800cd5b1cd';
const RAFAEL = 'f6b21c50-000b-5e70-878b-b5e7f5f9a410';
const PATRICIA = '2fb0cec5-0e79-5ae3-9dd8-bea87be4292f';
const ROSANGELA = '828a4d5b-6754-54c6-8b60-63833149e502';
const EDNA = '8ffa0d80-db2f-52a7-a275-08f89cce49c1';

const newUser = {
  name: 'Ana Nova',
  email: 'Ana.Nova@IpeAmarelo.example',
  cpf: '529.982.247-25',
  profileCode: 'caregiver',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('a promessa não falhou');
}

describe('leitura', () => {
  it('só o administrador lista usuários', async () => {
    await startDemoSession('professional');

    expect((await rejection(listUsers())).status).toBe(403);
  });

  it('lista em ordem de nome, com o CPF mascarado e paginação', async () => {
    await startDemoSession('admin');

    const result = await listUsers({ limit: 5 });

    const names = result.data.map((user) => user.name);
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    );
    expect(result.data[0].cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    expect(result.meta.pagination).toMatchObject({
      page: 1,
      limit: 5,
      total: 12,
    });
  });

  it('filtra por perfil, situação e busca no nome ou no e-mail', async () => {
    await startDemoSession('admin');

    const caregivers = await listUsers({ profileCode: 'caregiver' });
    const pending = await listUsers({ status: 'pending' });
    const search = await listUsers({ search: 'OKAMOTO' });

    expect(caregivers.meta.pagination.total).toBe(4);
    expect(pending.data.map((user) => user.id)).toEqual([EDNA]);
    expect(search.data.map((user) => user.name)).toEqual(['Beatriz Okamoto']);
  });

  it('marca o convite vencido do convidado', async () => {
    await startDemoSession('admin');

    const { data } = await getUser(EDNA);

    expect(data.invitation).toEqual({
      channel: 'temporary_password',
      status: 'expired',
      expiresAt: '2026-11-09T14:30:00.000Z',
      sentAt: null,
    });
  });

  it('mostra o CPF inteiro na consulta e responde 404 ao inexistente', async () => {
    await startDemoSession('admin');

    expect((await getUser(RAFAEL)).data.cpf).toMatch(/^\d{11}$/);
    expect(await rejection(getUser('inexistente'))).toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('cadastro', () => {
  it('cria o convidado e devolve a senha provisória de 24 horas', async () => {
    await startDemoSession('admin');

    const { data } = await createUser(newUser);

    expect(data.channel).toBe('temporary_password');
    expect(data.temporaryPassword).toHaveLength(20);
    expect(data.expiresAt).toBe('2026-11-11T15:00:00.000Z');
    expect(data.user).toMatchObject({
      name: 'Ana Nova',
      email: 'ana.nova@ipeamarelo.example',
      cpf: '52998224725',
      status: 'pending',
      profile: { code: 'caregiver' },
      invitation: {
        channel: 'temporary_password',
        status: 'pending',
        expiresAt: data.expiresAt,
        sentAt: null,
      },
    });
    expect(findUser(data.user.id)).not.toBeNull();
  });

  it('recusa corpo inválido com os campos', async () => {
    await startDemoSession('admin');

    expect(
      await rejection(createUser({ ...newUser, cpf: '111.111.111-11' })),
    ).toMatchObject({
      status: 422,
      fields: [{ field: 'cpf', code: 'IS_CPF' }],
    });
  });

  it('recusa e-mail ou CPF já usados na organização, inclusive por inativo', async () => {
    await startDemoSession('admin');
    const patricia = findUser(PATRICIA);

    expect(
      await rejection(createUser({ ...newUser, email: patricia.email })),
    ).toMatchObject({
      status: 409,
      code: 'USER_DUPLICATE_EMAIL',
      fields: [{ field: 'email', code: 'DUPLICATE' }],
    });
    expect(
      await rejection(createUser({ ...newUser, cpf: patricia.cpf })),
    ).toMatchObject({ status: 409, code: 'USER_DUPLICATE_CPF' });
  });

  it('bloqueia no limite do plano, contando convidados e ativos', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    // Basic: 10 vagas; a organização tem 11 convidados e ativos.
    expect(await rejection(createUser(newUser))).toMatchObject({
      status: 409,
      code: 'USER_PLAN_LIMIT_REACHED',
    });
  });

  it('bloqueia com a vigência vencida, antes do limite', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, {
      planId: BASIC_PLAN.id,
      endsAt: '2026-11-01T02:59:00.000Z',
    });

    expect((await rejection(createUser(newUser))).code).toBe(
      'USER_PLAN_EXPIRED',
    );
  });
});

describe('edição e perfil', () => {
  it('grava só os campos enviados e recusa corpo vazio', async () => {
    await startDemoSession('admin');

    const { data } = await updateUser(RAFAEL, { phone: null });

    expect(data.phone).toBeNull();
    expect(await rejection(updateUser(RAFAEL, {}))).toMatchObject({
      status: 422,
      code: 'USER_NOTHING_TO_UPDATE',
    });
  });

  it('troca o perfil e revoga os vínculos de cuidado que não combinam', async () => {
    await startDemoSession('admin');
    const active = () =>
      allLinks().filter(
        (link) => link.userId === ROSANGELA && link.status === 'active',
      );
    expect(active().length).toBeGreaterThan(0);

    const { data } = await changeUserProfile(ROSANGELA, {
      profileCode: 'professional',
    });

    expect(data.profile.code).toBe('professional');
    expect(active()).toEqual([]);
  });

  it('não troca o próprio perfil', async () => {
    await startDemoSession('admin');

    expect(
      await rejection(changeUserProfile(HELENA, { profileCode: 'family' })),
    ).toMatchObject({ status: 409, code: 'USER_SELF_PROFILE_CHANGE' });
  });
});

describe('situação, convite e senha provisória', () => {
  it('inativa e reativa, sem permitir a própria conta', async () => {
    await startDemoSession('admin');

    const inactive = (await deactivateUser(RAFAEL)).data;
    expect(inactive).toMatchObject({
      status: 'inactive',
      deletedAt: NOW.toISOString(),
    });
    expect((await rejection(deactivateUser(RAFAEL))).code).toBe(
      'USER_ALREADY_INACTIVE',
    );
    expect((await reactivateUser(RAFAEL)).data.status).toBe('active');
    expect((await rejection(reactivateUser(RAFAEL))).code).toBe(
      'USER_ALREADY_ACTIVE',
    );
    expect((await rejection(deactivateUser(HELENA))).code).toBe(
      'USER_SELF_STATUS_CHANGE',
    );
  });

  it('reativação respeita o limite do plano', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { planId: BASIC_PLAN.id });

    expect((await rejection(reactivateUser(PATRICIA))).code).toBe(
      'USER_PLAN_LIMIT_REACHED',
    );
  });

  it('reemite o convite só do convidado', async () => {
    await startDemoSession('admin');

    const { data } = await reissueInvitation(EDNA);

    expect(data.channel).toBe('temporary_password');
    expect(data.temporaryPassword).toHaveLength(20);
    expect((await getUser(EDNA)).data.invitation.status).toBe('pending');
    expect((await rejection(reissueInvitation(RAFAEL))).code).toBe(
      'USER_INVITATION_ALREADY_ACCEPTED',
    );
    expect((await rejection(reissueInvitation(PATRICIA))).code).toBe(
      'USER_INACTIVE',
    );
  });

  it('emite senha provisória só para outro usuário ativo', async () => {
    await startDemoSession('admin');

    expect((await issueTemporaryPassword(RAFAEL)).data.expiresAt).toBe(
      '2026-11-11T15:00:00.000Z',
    );
    expect((await rejection(issueTemporaryPassword(EDNA))).code).toBe(
      'AUTH_USER_NOT_FOUND',
    );
    expect((await rejection(issueTemporaryPassword(HELENA))).code).toBe(
      'AUTH_INVALID_STATE',
    );
  });
});

describe('convite por e-mail (BE-31)', () => {
  const LINK_EXPIRES_AT = '2026-11-13T15:00:00.000Z';
  const SENT_MESSAGE =
    'Convite enviado ao e-mail do usuário. O link vale até 13/11/2026 às 12:00 (horário de Brasília).';

  it('recusa o canal de e-mail com o SMTP desligado, antes de cadastrar', async () => {
    await startDemoSession('admin');
    const before = (await listUsers({ limit: 100 })).meta.pagination.total;

    expect(
      await rejection(createUser({ ...newUser, channel: 'email' })),
    ).toMatchObject({
      status: 422,
      code: 'USER_INVITATION_EMAIL_UNAVAILABLE',
      message:
        'O envio de convite por e-mail não está disponível. Use a senha provisória.',
      fields: [{ field: 'channel', code: 'UNAVAILABLE' }],
    });
    expect((await listUsers({ limit: 100 })).meta.pagination.total).toBe(
      before,
    );
    expect(
      (await rejection(reissueInvitation(EDNA, { channel: 'email' }))).code,
    ).toBe('USER_INVITATION_EMAIL_UNAVAILABLE');
  });

  it('com o SMTP ligado, convida por link de 72 horas, sem senha', async () => {
    await startDemoSession('admin');
    setInvitationEmailEnabled(true);

    const { data, meta } = await createUser(newUser);

    expect(data).toMatchObject({
      channel: 'email',
      expiresAt: LINK_EXPIRES_AT,
      delivery: { status: 'sent' },
    });
    expect(data).not.toHaveProperty('temporaryPassword');
    expect(meta.message).toBe(SENT_MESSAGE);
    expect(data.user.invitation).toEqual({
      channel: 'email',
      status: 'pending',
      expiresAt: LINK_EXPIRES_AT,
      sentAt: NOW.toISOString(),
    });
  });

  it('com o SMTP ligado, a senha provisória continua disponível a pedido', async () => {
    await startDemoSession('admin');
    setInvitationEmailEnabled(true);

    const { data } = await createUser({
      ...newUser,
      channel: 'temporary_password',
    });

    expect(data.channel).toBe('temporary_password');
    expect(data.temporaryPassword).toHaveLength(20);
  });

  it('a reemissão troca o canal do convite', async () => {
    await startDemoSession('admin');
    setInvitationEmailEnabled(true);

    const byLink = await reissueInvitation(EDNA);
    expect(byLink.data).toEqual({
      channel: 'email',
      expiresAt: LINK_EXPIRES_AT,
      delivery: { status: 'sent' },
    });
    expect(byLink.meta.message).toBe(SENT_MESSAGE);
    expect((await getUser(EDNA)).data.invitation).toMatchObject({
      channel: 'email',
      status: 'pending',
      sentAt: NOW.toISOString(),
    });

    const byPassword = await reissueInvitation(EDNA, {
      channel: 'temporary_password',
    });
    expect(byPassword.data.temporaryPassword).toHaveLength(20);
    expect((await getUser(EDNA)).data.invitation).toMatchObject({
      channel: 'temporary_password',
      status: 'pending',
      sentAt: null,
    });
  });

  it('trocar o e-mail do convidado por link cancela o link', async () => {
    await startDemoSession('admin');
    setInvitationEmailEnabled(true);
    const { data: created } = await createUser(newUser);

    const { data } = await updateUser(created.user.id, {
      email: 'ana.outra@ipeamarelo.example',
    });

    expect(data.invitation.status).toBe('invalidated');
  });

  it('trocar o e-mail do convidado por senha provisória não mexe no convite', async () => {
    await startDemoSession('admin');

    const { data } = await updateUser(EDNA, {
      email: 'edna.nova@ipeamarelo.example',
    });

    expect(data.invitation).toMatchObject({
      channel: 'temporary_password',
      status: 'expired',
    });
  });

  it('o estado simulado volta com o SMTP desligado', async () => {
    setInvitationEmailEnabled(true);
    resetMockState();
    await startDemoSession('admin');

    expect((await createUser(newUser)).data.channel).toBe('temporary_password');
  });
});

// Mensagens iguais às de `user.errors.ts` e `auth.errors.ts` do backend
// (conferidas em 13/11/2026, commit `ce991aa`): a tela mostra o texto que a
// API devolveria.
describe('mensagens de erro', () => {
  it('são as da API', async () => {
    await startDemoSession('admin');
    const patricia = findUser(PATRICIA);
    const messages = {};
    const collect = async (promise) => {
      const error = await rejection(promise);
      messages[error.code] = error.message;
    };

    await collect(createUser({ ...newUser, email: patricia.email }));
    await collect(createUser({ ...newUser, cpf: patricia.cpf }));
    await collect(updateUser(RAFAEL, {}));
    await collect(changeUserProfile(HELENA, { profileCode: 'family' }));
    await collect(deactivateUser(HELENA));
    await collect(reissueInvitation(RAFAEL));
    await collect(reissueInvitation(PATRICIA));
    await collect(issueTemporaryPassword(HELENA));
    changeTerm(organization.id, { endsAt: '2026-11-01T02:59:00.000Z' });
    await collect(createUser(newUser));

    expect(messages).toEqual({
      USER_DUPLICATE_EMAIL:
        'Já existe um usuário com este e-mail na organização. Se ele estiver inativo, reative-o.',
      USER_DUPLICATE_CPF:
        'Já existe um usuário com este CPF na organização. Se ele estiver inativo, reative-o.',
      USER_NOTHING_TO_UPDATE: 'Informe ao menos um campo para atualizar.',
      USER_SELF_PROFILE_CHANGE: 'Você não pode alterar o seu próprio perfil.',
      USER_SELF_STATUS_CHANGE:
        'Você não pode inativar ou reativar a sua própria conta.',
      USER_INVITATION_ALREADY_ACCEPTED:
        'O usuário já está ativo. Para uma nova senha, use a redefinição de senha.',
      USER_INACTIVE:
        'O usuário está inativo. Reative-o antes de reenviar o convite.',
      AUTH_INVALID_STATE: 'A operação não é permitida no estado atual.',
      USER_PLAN_EXPIRED:
        'A vigência do plano da organização venceu. Novos cadastros ficam bloqueados até a renovação.',
    });
  });
});

describe('alcance', () => {
  it('nada muda quando a operação é recusada', async () => {
    await startDemoSession('admin');
    const before = findUser(HELENA);

    await deactivateUser(HELENA).catch(() => null);
    await changeUserProfile(HELENA, { profileCode: 'family' }).catch(
      () => null,
    );

    expect(findUser(HELENA)).toEqual(before);
  });
});

// Usuários da organização simulados, no formato das rotas `users` e da
// senha temporária de `auth` (manual `users-*.md` e
// `auth-redefinir-senha-usuario.md`, conferidos em 13/11/2026, com o convite
// por e-mail do BE-31). A senha provisória só existe na resposta, como na
// API: o estado guarda apenas canal, situação, validade e envio do convite.
// Na integração, cada função passa a chamar a rota.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { formatMessageDateTime } from '../utils/format.js';
import { generateTemporaryPassword } from '../utils/temporaryPassword.js';
import { normalizeUserBody, userErrors } from '../utils/userFields.js';
import { currentViewer } from './authService.js';
import {
  ApiError,
  mockRequest,
  paginate,
  registerMockState,
  requirePermission,
  respond,
  validationError,
} from './mockApi.js';
import { currentPlan, currentTerm } from './organizationStore.js';
import { allLinks, changeLink, nextId } from './patientStore.js';
import { addUser, allUsers, changeUser, findUser } from './userStore.js';

const HOUR_MS = 60 * 60 * 1000;
// Senha provisória de 24 h e link de 72 h, os padrões da API.
const VALIDITY_MS = {
  temporary_password: 24 * HOUR_MS,
  email: 72 * HOUR_MS,
};

// Nenhum ambiente tem SMTP hoje, e o modo simulado acompanha: o convite sai
// por senha provisória. Os testes ligam o SMTP para cobrir a resposta do
// canal por e-mail, que a tela precisa tratar quando o servidor o tiver.
let invitationEmailEnabled = false;

registerMockState(() => {
  invitationEmailEnabled = false;
});

export function setInvitationEmailEnabled(enabled) {
  invitationEmailEnabled = enabled;
}

// Nome do perfil como a API devolve, sem acento; a tela usa os próprios
// rótulos pelo código.
const PROFILE_NAMES = {
  admin: 'Administrador',
  professional: 'Profissional de saude',
  caregiver: 'Cuidador',
  family: 'Familiar',
};

const error = (status, code, message, fields = null) =>
  new ApiError({ status, code, message, fields });

const userNotFound = () =>
  error(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');

function viewerFor(permission) {
  const viewer = currentViewer();
  requirePermission(viewer, permission);
  return viewer;
}

function targetUser(userId) {
  const user = findUser(userId);
  if (!user) {
    throw userNotFound();
  }
  return user;
}

const isLive = (invitation, now) =>
  invitation.status === 'pending' &&
  Date.parse(invitation.expiresAt) > now.getTime();

/**
 * O usuário como a API devolve agora: o convite vivo vence pelo relógio, e
 * o link cancelado continua cancelado.
 */
function userView(user, now = new Date()) {
  if (user.status !== 'pending' || !user.invitation) {
    return { ...user, invitation: null };
  }
  const { invitation } = user;
  const expired = invitation.status === 'pending' && !isLive(invitation, now);
  return {
    ...user,
    invitation: {
      ...invitation,
      status: expired ? 'expired' : invitation.status,
    },
  };
}

// Na listagem, a API mostra só os seis dígitos do meio do CPF.
const maskCpf = (cpf) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;

function matches(user, search) {
  const term = search.trim().toLowerCase();
  return (
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  );
}

export function listUsers({ status, profileCode, search, page, limit } = {}) {
  return mockRequest(() => {
    viewerFor(P.USERS_READ);
    const users = allUsers()
      .filter((user) => !status || user.status === status)
      .filter((user) => !profileCode || user.profile.code === profileCode)
      .filter((user) => !search || matches(user, search))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id),
      )
      .map((user) => ({ ...userView(user), cpf: maskCpf(user.cpf) }));
    return paginate(users, { page, limit });
  });
}

export function getUser(userId) {
  return mockRequest(() => {
    viewerFor(P.USERS_READ);
    return respond(userView(targetUser(userId)));
  });
}

/** Vigência e limite do plano, na ordem da API: o vencimento vem antes. */
function assertSeat(organizationId, now) {
  const term = currentTerm(organizationId);
  if (term?.endsAt && Date.parse(term.endsAt) <= now.getTime()) {
    throw error(
      409,
      'USER_PLAN_EXPIRED',
      'A vigência do plano da organização venceu. Novos cadastros ficam bloqueados até a renovação.',
    );
  }
  const limit = term?.userLimit ?? currentPlan(organizationId)?.userLimit;
  const used = allUsers().filter((user) =>
    ['pending', 'active'].includes(user.status),
  ).length;
  if (used >= limit) {
    throw error(
      409,
      'USER_PLAN_LIMIT_REACHED',
      'O limite de usuários do plano foi atingido. Inative um usuário ou solicite a mudança de plano.',
    );
  }
}

// E-mail e CPF valem uma vez na organização, inclusive para inativos.
function assertUnique({ email, cpf }, exceptId) {
  const others = allUsers().filter((user) => user.id !== exceptId);
  if (email && others.some((user) => user.email === email)) {
    throw error(
      409,
      'USER_DUPLICATE_EMAIL',
      'Já existe um usuário com este e-mail na organização. Se ele estiver inativo, reative-o.',
      [{ field: 'email', code: 'DUPLICATE' }],
    );
  }
  if (cpf && others.some((user) => user.cpf === cpf)) {
    throw error(
      409,
      'USER_DUPLICATE_CPF',
      'Já existe um usuário com este CPF na organização. Se ele estiver inativo, reative-o.',
      [{ field: 'cpf', code: 'DUPLICATE' }],
    );
  }
}

function assertValid(errors) {
  if (errors.length > 0) {
    throw validationError(errors);
  }
}

/** Canal pedido ou o padrão do servidor; e-mail sem SMTP é recusado antes de gravar. */
function invitationChannel(requested) {
  const channel =
    requested ?? (invitationEmailEnabled ? 'email' : 'temporary_password');
  if (channel === 'email' && !invitationEmailEnabled) {
    throw error(
      422,
      'USER_INVITATION_EMAIL_UNAVAILABLE',
      'O envio de convite por e-mail não está disponível. Use a senha provisória.',
      [{ field: 'channel', code: 'UNAVAILABLE' }],
    );
  }
  return channel;
}

/**
 * Convite novo no canal: o que o estado guarda e o que a resposta traz. A
 * senha só existe na resposta; o link nunca sai da API, só a confirmação do
 * envio.
 */
function issueInvitation(channel, now) {
  const expiresAt = new Date(
    now.getTime() + VALIDITY_MS[channel],
  ).toISOString();
  if (channel === 'temporary_password') {
    return {
      stored: { channel, status: 'pending', expiresAt, sentAt: null },
      data: {
        channel,
        temporaryPassword: generateTemporaryPassword(),
        expiresAt,
      },
      meta: {},
    };
  }
  return {
    stored: {
      channel,
      status: 'pending',
      expiresAt,
      sentAt: now.toISOString(),
    },
    data: { channel, expiresAt, delivery: { status: 'sent' } },
    meta: {
      message: `Convite enviado ao e-mail do usuário. O link vale até ${formatMessageDateTime(expiresAt)} (horário de Brasília).`,
    },
  };
}

export function createUser(body) {
  return mockRequest(() => {
    const viewer = viewerFor(P.USERS_CREATE);
    assertValid(userErrors(body));
    const channel = invitationChannel(body.channel);
    const now = new Date();
    assertSeat(viewer.organization.id, now);
    const values = normalizeUserBody(body);
    assertUnique(values);
    const invitation = issueInvitation(channel, now);
    const user = {
      id: nextId('e5e70000'),
      name: values.name,
      email: values.email,
      cpf: values.cpf,
      phone: values.phone ?? null,
      status: 'pending',
      profile: {
        code: values.profileCode,
        name: PROFILE_NAMES[values.profileCode],
      },
      invitation: invitation.stored,
      lastAccessAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
    };
    addUser(user);
    return respond(
      { user: userView(user, now), ...invitation.data },
      invitation.meta,
    );
  });
}

export function updateUser(userId, body) {
  return mockRequest(() => {
    viewerFor(P.USERS_UPDATE);
    assertValid(userErrors(body, { partial: true }));
    const user = targetUser(userId);
    const values = normalizeUserBody(body);
    if (Object.keys(values).length === 0) {
      throw error(
        422,
        'USER_NOTHING_TO_UPDATE',
        'Informe ao menos um campo para atualizar.',
      );
    }
    assertUnique(values, userId);
    const now = new Date();
    const changes = { ...values, updatedAt: now.toISOString() };
    // O link foi para o endereço antigo: a troca do e-mail o cancela, e o
    // administrador reemite.
    const emailChanged = values.email && values.email !== user.email;
    if (
      emailChanged &&
      user.invitation?.channel === 'email' &&
      isLive(user.invitation, now)
    ) {
      changes.invitation = { ...user.invitation, status: 'invalidated' };
    }
    changeUser(user.id, changes);
    return respond(userView(findUser(userId)));
  });
}

// Vínculos de cuidado só valem no papel igual ao perfil; perfil novo revoga
// os que deixaram de combinar, como a API (BE-10).
function revokeIncompatibleLinks(userId, profileCode, now) {
  for (const link of allLinks()) {
    if (
      link.userId === userId &&
      link.status === 'active' &&
      link.role !== profileCode
    ) {
      changeLink(link.id, {
        status: 'revoked',
        revokedAt: now,
        updatedAt: now,
      });
    }
  }
}

export function changeUserProfile(userId, { profileCode } = {}) {
  return mockRequest(() => {
    const viewer = viewerFor(P.USERS_CHANGE_PROFILE);
    if (userId === viewer.user.id) {
      throw error(
        409,
        'USER_SELF_PROFILE_CHANGE',
        'Você não pode alterar o seu próprio perfil.',
      );
    }
    if (!PROFILE_NAMES[profileCode]) {
      throw validationError([{ field: 'profileCode', code: 'IS_IN' }]);
    }
    const user = targetUser(userId);
    if (user.profile.code !== profileCode) {
      const now = new Date().toISOString();
      changeUser(userId, {
        profile: { code: profileCode, name: PROFILE_NAMES[profileCode] },
        updatedAt: now,
      });
      revokeIncompatibleLinks(userId, profileCode, now);
    }
    return respond(userView(findUser(userId)));
  });
}

function assertNotSelf(viewer, userId) {
  if (userId === viewer.user.id) {
    throw error(
      409,
      'USER_SELF_STATUS_CHANGE',
      'Você não pode inativar ou reativar a sua própria conta.',
    );
  }
}

export function deactivateUser(userId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.USERS_CHANGE_STATUS);
    assertNotSelf(viewer, userId);
    const user = targetUser(userId);
    if (user.status === 'inactive') {
      throw error(409, 'USER_ALREADY_INACTIVE', 'O usuário já está inativo.');
    }
    const now = new Date().toISOString();
    // O convite do convidado vence na hora, para não voltar a valer depois
    // de uma reativação.
    changeUser(userId, {
      status: 'inactive',
      deletedAt: now,
      updatedAt: now,
      invitation: user.invitation
        ? { ...user.invitation, expiresAt: now }
        : null,
    });
    return respond(userView(findUser(userId)));
  });
}

export function reactivateUser(userId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.USERS_CHANGE_STATUS);
    assertNotSelf(viewer, userId);
    const user = targetUser(userId);
    if (user.status !== 'inactive') {
      throw error(409, 'USER_ALREADY_ACTIVE', 'O usuário não está inativo.');
    }
    const now = new Date();
    assertSeat(viewer.organization.id, now);
    changeUser(userId, {
      status: 'active',
      deletedAt: null,
      updatedAt: now.toISOString(),
    });
    return respond(userView(findUser(userId)));
  });
}

/** O corpo é opcional: sem `channel`, vale o padrão do servidor. */
export function reissueInvitation(userId, { channel: requested } = {}) {
  return mockRequest(() => {
    viewerFor(P.USERS_CREATE);
    const channel = invitationChannel(requested);
    const user = targetUser(userId);
    if (user.status === 'active') {
      throw error(
        409,
        'USER_INVITATION_ALREADY_ACCEPTED',
        'O usuário já está ativo. Para uma nova senha, use a redefinição de senha.',
      );
    }
    if (user.status === 'inactive') {
      throw error(
        409,
        'USER_INACTIVE',
        'O usuário está inativo. Reative-o antes de reenviar o convite.',
      );
    }
    const now = new Date();
    const invitation = issueInvitation(channel, now);
    changeUser(userId, {
      invitation: invitation.stored,
      updatedAt: now.toISOString(),
    });
    return respond(invitation.data, invitation.meta);
  });
}

/** POST /auth/users/{userId}/temporary-password: só outro usuário ativo. */
export function issueTemporaryPassword(userId) {
  return mockRequest(() => {
    const viewer = viewerFor(P.USERS_RESET_PASSWORD);
    if (userId === viewer.user.id) {
      throw error(
        409,
        'AUTH_INVALID_STATE',
        'A operação não é permitida no estado atual.',
      );
    }
    const user = findUser(userId);
    if (user?.status !== 'active') {
      throw error(404, 'AUTH_USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    const { data } = issueInvitation('temporary_password', new Date());
    return respond({
      temporaryPassword: data.temporaryPassword,
      expiresAt: data.expiresAt,
    });
  });
}

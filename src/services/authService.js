// Autenticação simulada, no formato das rotas `auth` da API (manual da API,
// `docs/api/endpoints/auth-*.md`, conferido em 10/11/2026). Na integração,
// cada função passa a chamar a rota correspondente, e telas e sessão não mudam.
import { permissionsFor } from '../constants/permissions.js';
import {
  DEMO_PASSWORD,
  DEMO_RESET_LINK,
  RECOVERY_GUIDANCE,
} from '../data/mocks/credentials.js';
import { organization } from '../data/mocks/organization.js';
import { platformAdmin, platformOrganization } from '../data/mocks/platform.js';
import {
  normalizeEmail,
  normalizeOrganizationCode,
  validateEmail,
  validateOrganizationCode,
  validatePassword,
} from '../utils/authValidation.js';
import {
  ApiError,
  mockRequest,
  notFoundError,
  registerMockState,
  respond,
  validationError,
} from './mockApi.js';
import { allUsers, changeUser } from './userStore.js';

const MINUTE_MS = 60 * 1000;

// Prazos de `src/config/auth.config.ts` do backend.
const SESSION_DURATION_MS = 12 * 60 * MINUTE_MS;
const RESTRICTED_SESSION_DURATION_MS = 10 * MINUTE_MS;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_BLOCK_MS = 15 * MINUTE_MS;
const RECOVERY_MAX_PER_ACCOUNT = 3;
const RECOVERY_WINDOW_MS = 60 * MINUTE_MS;

export const SESSION_STATES = Object.freeze({
  AUTHENTICATED: 'authenticated',
  PASSWORD_CHANGE_REQUIRED: 'password_change_required',
});

export const AUTH_ERRORS = Object.freeze({
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TEMPORARILY_BLOCKED: 'AUTH_TEMPORARILY_BLOCKED',
  UNAUTHENTICATED: 'AUTH_UNAUTHENTICATED',
  PASSWORD_REUSE: 'AUTH_PASSWORD_REUSE',
  CURRENT_PASSWORD_INVALID: 'AUTH_CURRENT_PASSWORD_INVALID',
  RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID_OR_EXPIRED',
});

export const DEMO_PROFILES = [
  'admin',
  'professional',
  'caregiver',
  'family',
  'platform_admin',
];

// Mensagens iguais às da API; as telas mostram os próprios textos, pelo código.
const invalidCredentials = () =>
  new ApiError({
    status: 401,
    code: AUTH_ERRORS.INVALID_CREDENTIALS,
    message: 'Credenciais inválidas.',
  });
const temporarilyBlocked = () =>
  new ApiError({
    status: 429,
    code: AUTH_ERRORS.TEMPORARILY_BLOCKED,
    message: 'Muitas tentativas. Aguarde antes de tentar novamente.',
  });
const unauthenticated = () =>
  new ApiError({
    status: 401,
    code: AUTH_ERRORS.UNAUTHENTICATED,
    message: 'Sessão inválida ou expirada.',
  });
const passwordReuse = () =>
  new ApiError({
    status: 422,
    code: AUTH_ERRORS.PASSWORD_REUSE,
    message: 'A nova senha não pode ser igual à atual.',
  });
const resetTokenInvalid = () =>
  new ApiError({
    status: 422,
    code: AUTH_ERRORS.RESET_TOKEN_INVALID,
    message: 'Token de redefinição inválido ou expirado.',
  });

// Estado que a API guarda no banco e no Redis: senha trocada, falhas de
// login, pedidos de recuperação e link já usado. A situação do usuário fica
// no estado dos usuários (`userStore.js`), que as telas de usuários mudam.
let accounts = new Map();
let loginFailures = new Map();
let recoveryRequests = new Map();
let resetLinkUsed = false;
// Sessão de quem consulta. Na API, o token diz quem é; aqui, os serviços
// simulados leem a sessão guardada no login, como o cliente HTTP vai guardar
// o token.
let viewer = null;

registerMockState(() => {
  accounts = new Map();
  loginFailures = new Map();
  recoveryRequests = new Map();
  resetLinkUsed = false;
  viewer = null;
});

/** Sessão simulada em uso pelos serviços; `null` sem login. */
export function currentViewer() {
  return viewer;
}

function openSession(account, state) {
  viewer = buildSession(account, state);
  return respond(viewer);
}

function directories() {
  return [
    { organization, members: allUsers() },
    { organization: platformOrganization, members: [platformAdmin] },
  ];
}

function findAccount(organizationCode, email) {
  const directory = directories().find(
    (entry) => entry.organization.code === organizationCode,
  );
  const user = directory?.members.find((member) => member.email === email);
  if (!user) {
    return null;
  }
  const changes = accounts.get(user.id) ?? {};
  return {
    user,
    organization: directory.organization,
    password: changes.password ?? DEMO_PASSWORD,
    status: user.status,
  };
}

function updateAccount(userId, changes) {
  accounts.set(userId, { ...accounts.get(userId), ...changes });
}

function assertValid(checks) {
  const fields = Object.entries(checks)
    .filter(([, error]) => error)
    .map(([field, code]) => ({ field, code }));
  if (fields.length > 0) {
    throw validationError(fields);
  }
}

function buildSession({ user, organization: org }, state) {
  const restricted = state === SESSION_STATES.PASSWORD_CHANGE_REQUIRED;
  const duration = restricted
    ? RESTRICTED_SESSION_DURATION_MS
    : SESSION_DURATION_MS;
  return {
    state,
    expiresAt: new Date(Date.now() + duration).toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
    },
    organization: {
      id: org.id,
      code: org.code,
      tradeName: org.tradeName,
      kind: org.kind ?? 'tenant',
    },
    // A sessão restrita só alcança o primeiro acesso e o Sair.
    permissions: restricted ? [] : permissionsFor(user.profile.code),
  };
}

// Como a API: o bloqueio é conferido antes da senha, então até a senha certa
// é recusada enquanto ele dura; cada falha renova o prazo de 15 minutos.
function assertLoginAllowed(key) {
  const failures = loginFailures.get(key);
  if (!failures || Date.now() >= failures.until) {
    loginFailures.delete(key);
    return;
  }
  if (failures.count >= LOGIN_MAX_FAILURES) {
    throw temporarilyBlocked();
  }
}

function recordLoginFailure(key) {
  const count = (loginFailures.get(key)?.count ?? 0) + 1;
  loginFailures.set(key, { count, until: Date.now() + LOGIN_BLOCK_MS });
}

export function login(credentials) {
  return mockRequest(() => {
    assertValid({
      organizationCode: validateOrganizationCode(credentials.organizationCode),
      email: validateEmail(credentials.email),
      password: validatePassword(credentials.password),
    });
    const organizationCode = normalizeOrganizationCode(
      credentials.organizationCode,
    );
    const email = normalizeEmail(credentials.email);
    const key = `${organizationCode}|${email}`;
    assertLoginAllowed(key);

    const account = findAccount(organizationCode, email);
    const allowed = ['active', 'pending'].includes(account?.status);
    if (!allowed || account.password !== credentials.password) {
      recordLoginFailure(key);
      throw invalidCredentials();
    }
    loginFailures.delete(key);

    // O convite vencido (24 h) também responde 401 na API; aqui ele é
    // ignorado, porque as datas dos dados simulados ficam no passado e a
    // convidada deixaria de demonstrar o primeiro acesso.
    const state =
      account.status === 'pending'
        ? SESSION_STATES.PASSWORD_CHANGE_REQUIRED
        : SESSION_STATES.AUTHENTICATED;
    return openSession(account, state);
  });
}

export function completeFirstAccess(session, { newPassword }) {
  return mockRequest(() => {
    const valid =
      session?.state === SESSION_STATES.PASSWORD_CHANGE_REQUIRED &&
      Date.now() < Date.parse(session.expiresAt);
    if (!valid) {
      throw unauthenticated();
    }
    assertValid({ newPassword: validatePassword(newPassword) });
    const account = findAccount(session.organization.code, session.user.email);
    if (newPassword === account.password) {
      throw passwordReuse();
    }
    // O convidado aceita o convite neste passo, como na API.
    updateAccount(account.user.id, { password: newPassword });
    if (account.user.id !== platformAdmin.id) {
      changeUser(account.user.id, { status: 'active', invitation: null });
    }
    return respond(null);
  });
}

export function requestPasswordRecovery(request) {
  return mockRequest(() => {
    assertValid({
      organizationCode: validateOrganizationCode(request.organizationCode),
      email: validateEmail(request.email),
    });
    const key = `${normalizeOrganizationCode(request.organizationCode)}|${normalizeEmail(request.email)}`;
    const now = Date.now();
    const current = recoveryRequests.get(key);
    const window =
      current && now < current.until
        ? current
        : { count: 0, until: now + RECOVERY_WINDOW_MS };
    if (window.count >= RECOVERY_MAX_PER_ACCOUNT) {
      throw temporarilyBlocked();
    }
    recoveryRequests.set(key, { ...window, count: window.count + 1 });
    // A resposta é a mesma exista ou não a conta, para que a rota não revele
    // quem tem conta em qual organização.
    return respond(null, { message: RECOVERY_GUIDANCE });
  });
}

export function resetPassword({ token, newPassword }) {
  return mockRequest(() => {
    assertValid({ newPassword: validatePassword(newPassword) });
    if (token !== DEMO_RESET_LINK.token || resetLinkUsed) {
      throw resetTokenInvalid();
    }
    const account = findAccount(
      DEMO_RESET_LINK.organizationCode,
      DEMO_RESET_LINK.email,
    );
    resetLinkUsed = true;
    updateAccount(account.user.id, { password: newPassword });
    return respond(null);
  });
}

function demoAccount(profileCode) {
  if (profileCode === 'platform_admin') {
    return { user: platformAdmin, organization: platformOrganization };
  }
  const user = allUsers().find(
    (candidate) =>
      candidate.profile.code === profileCode && candidate.status === 'active',
  );
  return user ? { user, organization } : null;
}

/** Atalho de demonstração: entra direto com um usuário do perfil escolhido. */
export function startDemoSession(profileCode) {
  return mockRequest(() => {
    const account = demoAccount(profileCode);
    if (!account) {
      throw notFoundError('Não há usuário de demonstração para este perfil.');
    }
    return openSession(account, SESSION_STATES.AUTHENTICATED);
  });
}

export function endSession() {
  return mockRequest(() => {
    viewer = null;
    return respond(null);
  });
}

const currentPasswordInvalid = () =>
  new ApiError({
    status: 422,
    code: AUTH_ERRORS.CURRENT_PASSWORD_INVALID,
    message: 'A senha atual não confere.',
  });

/**
 * PUT /auth/password: troca a senha de quem está na sessão. Como na API, a
 * troca encerra todas as sessões da conta, inclusive esta, e o login
 * seguinte pede a senha nova.
 */
export function changePassword({ currentPassword, newPassword } = {}) {
  return mockRequest(() => {
    const valid =
      viewer?.state === SESSION_STATES.AUTHENTICATED &&
      Date.now() < Date.parse(viewer.expiresAt);
    if (!valid) {
      throw unauthenticated();
    }
    assertValid({
      currentPassword: validatePassword(currentPassword ?? ''),
      newPassword: validatePassword(newPassword ?? ''),
    });
    const account = findAccount(viewer.organization.code, viewer.user.email);
    if (account.password !== currentPassword) {
      throw currentPasswordInvalid();
    }
    if (newPassword === currentPassword) {
      throw passwordReuse();
    }
    updateAccount(account.user.id, { password: newPassword });
    viewer = null;
    return respond(null);
  });
}

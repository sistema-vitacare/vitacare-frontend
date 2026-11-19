// Sessão e autenticação pelas rotas `auth` e `profile` da API (manual da API,
// `auth-*.md` e `profile-consultar.md`, conferido em 19/11/2026 no commit
// `3beebe3` do backend). A sessão fica na aba (`sessionStorage`): recarregar
// a página, inclusive a recarga automática depois de um deploy, não pede
// login de novo, e outra aba ou outro navegador não a herdam.
import { permissionsFor } from '../constants/permissions.js';
import { organization } from '../data/mocks/organization.js';
import { platformAdmin, platformOrganization } from '../data/mocks/platform.js';
import {
  normalizeEmail,
  normalizeOrganizationCode,
} from '../utils/authValidation.js';
import { apiGet, apiPost, apiPut, configureApiSession } from './apiClient.js';
import { registerMockState } from './mockApi.js';
import { allUsers } from './userStore.js';

export const SESSION_STATES = Object.freeze({
  AUTHENTICATED: 'authenticated',
  PASSWORD_CHANGE_REQUIRED: 'password_change_required',
  TERMS_ACCEPTANCE_REQUIRED: 'terms_acceptance_required',
});

export const AUTH_ERRORS = Object.freeze({
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TEMPORARILY_BLOCKED: 'AUTH_TEMPORARILY_BLOCKED',
  UNAUTHENTICATED: 'AUTH_UNAUTHENTICATED',
  PASSWORD_REUSE: 'AUTH_PASSWORD_REUSE',
  CURRENT_PASSWORD_INVALID: 'AUTH_CURRENT_PASSWORD_INVALID',
  RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID_OR_EXPIRED',
});

const STORAGE_KEY = 'vitacare:session';

// Token e sessão da aba. O `sessionStorage` é a fonte: a leitura acompanha o
// que está guardado, e o objeto só muda quando o texto guardado muda. Sem
// ele (modo privado restrito), a sessão fica na memória até recarregar.
let memory = null;
let cache = { text: null, value: null };
const listeners = new Set();

function storage() {
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function save(value) {
  const store = storage();
  if (!store) {
    memory = value;
    return;
  }
  try {
    if (value) {
      const text = JSON.stringify(value);
      store.setItem(STORAGE_KEY, text);
      cache = { text, value };
    } else {
      store.removeItem(STORAGE_KEY);
      cache = { text: null, value: null };
    }
  } catch {
    memory = value;
  }
}

function read() {
  const store = storage();
  if (!store) {
    return memory;
  }
  try {
    const text = store.getItem(STORAGE_KEY);
    if (text !== cache.text) {
      cache = { text, value: text ? JSON.parse(text) : null };
    }
    return cache.value;
  } catch {
    return memory;
  }
}

function load() {
  const stored = read();
  if (stored && Date.now() >= Date.parse(stored.session.expiresAt)) {
    // Sessão que passou do prazo absoluto não volta: a API já a recusa.
    save(null);
    return null;
  }
  return stored;
}

function notify(event) {
  listeners.forEach((listener) => listener(event));
}

/**
 * Sessão da API no formato que as telas e os serviços ainda simulados leem:
 * o perfil dentro do usuário e o nome fantasia em `tradeName`.
 */
function toSession({ state, expiresAt, idleTimeoutSeconds, session }) {
  return {
    state,
    expiresAt,
    idleTimeoutSeconds: idleTimeoutSeconds ?? null,
    user: { ...session.user, profile: session.profile },
    organization: {
      id: session.organization.id,
      code: session.organization.code,
      tradeName: session.organization.name,
      legalName: session.organization.legalName,
      kind: session.organization.kind,
      status: session.organization.status,
      plan: session.organization.plan,
    },
    permissions: session.permissions,
    terms: session.terms,
  };
}

configureApiSession({
  getToken: () => load()?.token ?? null,
  onUnauthorized: () => {
    save(null);
    notify({ type: 'expired' });
  },
  // Termo novo publicado com a sessão aberta: as rotas passam a responder
  // 403 até o aceite, e as permissões da sessão deixam de valer.
  onTermsRequired: () => {
    const stored = load();
    if (!stored) {
      return;
    }
    const session = {
      ...stored.session,
      state: SESSION_STATES.TERMS_ACCEPTANCE_REQUIRED,
      permissions: [],
      terms: { ...stored.session.terms, required: true },
    };
    save({ ...stored, session });
    notify({ type: 'terms', session });
  },
});

registerMockState(() => {
  save(null);
  memory = null;
  listeners.clear();
});

/** Sessão de quem consulta; `null` sem login. */
export function currentViewer() {
  return load()?.session ?? null;
}

/** Sessão guardada na aba, se ainda estiver no prazo. */
export function restoreSession() {
  return currentViewer();
}

/**
 * Avisa quando a API encerra a sessão (`{ type: 'expired' }`) ou pede o
 * termo (`{ type: 'terms', session }`). Devolve a função que cancela.
 */
export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function login({ organizationCode, email, password }) {
  const { data, meta } = await apiPost(
    '/auth/login',
    {
      organizationCode: normalizeOrganizationCode(organizationCode),
      email: normalizeEmail(email),
      password,
    },
    { auth: false },
  );
  const session = toSession(data);
  save({ token: data.accessToken, session });
  return { data: session, meta };
}

/**
 * GET /profile: as permissões depois do aceite do termo. O prazo e o estado
 * são os da sessão guardada; o termo pendente vem de `terms.required`.
 */
export async function refreshSession() {
  const stored = load();
  const { data } = await apiGet('/profile');
  const session = toSession({
    state: data.terms.required
      ? SESSION_STATES.TERMS_ACCEPTANCE_REQUIRED
      : SESSION_STATES.AUTHENTICATED,
    expiresAt: stored.session.expiresAt,
    idleTimeoutSeconds: stored.session.idleTimeoutSeconds,
    session: data,
  });
  save({ ...stored, session });
  return session;
}

/**
 * Sai pela API. A sessão termina na tela antes da resposta: o logout que
 * falha ou responde 401 não deixa ninguém preso numa sessão.
 */
export async function endSession() {
  const token = load()?.token;
  save(null);
  if (token) {
    await apiPost('/auth/logout', undefined, { token }).catch(() => null);
  }
  return { data: null, meta: {} };
}

/** Troca da senha provisória, com o token da sessão restrita. */
export async function completeFirstAccess({ newPassword }) {
  const response = await apiPost('/auth/password/first-access', {
    newPassword,
  });
  // A API encerra a sessão restrita e exige login com a senha nova.
  save(null);
  return response;
}

/** PUT /auth/password: a troca encerra todas as sessões da conta. */
export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiPut('/auth/password', {
    currentPassword,
    newPassword,
  });
  save(null);
  return response;
}

/** A resposta (`202`) é a mesma para conta existente ou não. */
export function requestPasswordRecovery({ organizationCode, email }) {
  return apiPost(
    '/auth/password-recovery/request',
    {
      organizationCode: normalizeOrganizationCode(organizationCode),
      email: normalizeEmail(email),
    },
    { auth: false },
  );
}

export function resetPassword({ token, newPassword }) {
  return apiPost(
    '/auth/password-recovery/reset',
    { token, newPassword },
    { auth: false },
  );
}

// Sessão de demonstração, sem a API. Fica só para os testes dos serviços
// ainda simulados, que leem quem consulta por ela, e sai com o último deles
// (FE-65 do INTEGRACAO.md).
function demoAccount(profileCode) {
  if (profileCode === 'platform_admin') {
    return { user: platformAdmin, organization: platformOrganization };
  }
  const user = allUsers().find(
    (candidate) =>
      candidate.profile.code === profileCode && candidate.status === 'active',
  );
  return { user, organization };
}

export async function startDemoSession(profileCode) {
  const { user, organization: org } = demoAccount(profileCode);
  const session = {
    state: SESSION_STATES.AUTHENTICATED,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    idleTimeoutSeconds: null,
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
    permissions: permissionsFor(user.profile.code),
    terms: { required: false },
  };
  save({ token: null, session });
  return { data: session, meta: {} };
}

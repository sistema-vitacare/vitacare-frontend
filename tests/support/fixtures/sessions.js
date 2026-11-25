// Sessões dos testes no formato do login da API (`auth-login.md` e
// `profile-consultar.md`), com os usuários de demonstração: os ids e a
// organização são os dos dados simulados, para que as telas ainda simuladas
// encontrem quem consulta.
import { permissionsFor } from '../../../src/constants/permissions.js';
import { organization } from '../../../src/data/mocks/organization.js';
import {
  platformAdmin,
  platformOrganization,
} from '../../../src/data/mocks/platform.js';
import { users } from '../../../src/data/mocks/users.js';
import { apiFailure } from '../apiStub.js';

export const TEST_PASSWORD = 'senha-de-teste';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Nomes dos perfis como a API os devolve, sem acento (a tela usa os
// próprios rótulos, pelo código).
const PROFILE_NAMES = {
  admin: 'Administrador',
  professional: 'Profissional de saude',
  caregiver: 'Cuidador',
  family: 'Familiar',
  platform_admin: 'Administrador master',
};

const ENTERPRISE = {
  code: 'enterprise',
  name: 'Enterprise',
  features: [
    'patient_management',
    'health_records',
    'patient_history',
    'automatic_alerts',
    'responsive_access',
    'extended_registration',
    'management_reports',
    'operational_dashboard',
    'custom_deployment',
  ],
  termStatus: 'active',
};

export const CURRENT_TERMS_VERSION = 2;

/** Usuário de demonstração do perfil, o mesmo dos atalhos de antes. */
export function demoUser(profileCode) {
  if (profileCode === 'platform_admin') {
    return platformAdmin;
  }
  return users.find(
    (user) => user.profile.code === profileCode && user.status === 'active',
  );
}

export const invitedUser = users.find((user) => user.status === 'pending');

function organizationOf(user) {
  return user.profile.code === 'platform_admin'
    ? platformOrganization
    : organization;
}

function sessionBlock(user, { termsRequired = false } = {}) {
  const org = organizationOf(user);
  const platform = org.kind === 'platform';
  const restricted = user.status === 'pending';
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: '***.982.247-**',
      phone: user.phone ?? null,
      status: user.status,
      createdAt: user.createdAt,
    },
    profile: {
      code: user.profile.code,
      name: PROFILE_NAMES[user.profile.code],
    },
    permissions:
      restricted || termsRequired ? [] : permissionsFor(user.profile.code),
    organization: {
      id: org.id,
      code: org.code,
      name: org.tradeName,
      legalName: org.legalName,
      kind: org.kind,
      status: 'active',
      plan: platform ? null : ENTERPRISE,
    },
    terms: {
      required: termsRequired,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: termsRequired
        ? CURRENT_TERMS_VERSION - 1
        : CURRENT_TERMS_VERSION,
    },
  };
}

/** `data` do login da API para o usuário, no estado que ele teria. */
export function loginData(user, { termsRequired = false } = {}) {
  const restricted = user.status === 'pending';
  let state = 'authenticated';
  if (restricted) {
    state = 'password_change_required';
  } else if (termsRequired) {
    state = 'terms_acceptance_required';
  }
  return {
    state,
    accessToken: `token-${user.id}`,
    tokenType: 'Bearer',
    expiresAt: new Date(
      Date.now() + (restricted ? 10 * MINUTE_MS : 12 * HOUR_MS),
    ).toISOString(),
    ...(restricted ? {} : { idleTimeoutSeconds: 1800 }),
    session: sessionBlock(user, { termsRequired }),
  };
}

/** Dados do formulário de login do usuário de demonstração do perfil. */
export function credentialsFor(profileCode) {
  const user = demoUser(profileCode);
  return {
    organizationCode: organizationOf(user).code,
    email: user.email,
    password: TEST_PASSWORD,
  };
}

const everyone = () => [platformAdmin, ...users];
const byToken = (token) =>
  everyone().find((user) => `token-${user.id}` === token);

/**
 * Login, Sair e próprio cadastro dos usuários de demonstração, com a senha
 * `TEST_PASSWORD`, e o contador de notificações não lidas, zerado, que o
 * sino pede em toda tela autenticada. Os usuários em `termsPending` entram
 * com o termo pendente.
 */
export function sessionHandlers({ termsPending = [] } = {}) {
  return {
    'POST /auth/login': ({ body }) => {
      const user = everyone().find(
        (candidate) =>
          organizationOf(candidate).code === body.organizationCode &&
          candidate.email === body.email &&
          ['active', 'pending'].includes(candidate.status),
      );
      if (!user || body.password !== TEST_PASSWORD) {
        return apiFailure(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
        );
      }
      return {
        data: loginData(user, {
          termsRequired: termsPending.includes(user.profile.code),
        }),
        meta: {},
      };
    },
    'POST /auth/logout': () => ({ data: null, meta: {} }),
    'GET /profile': ({ token }) => {
      const user = byToken(token);
      if (!user) {
        return apiFailure(
          401,
          'AUTH_UNAUTHENTICATED',
          'Autenticação necessária.',
        );
      }
      return { data: sessionBlock(user), meta: {} };
    },
    'GET /notifications/unread-count': () => ({
      data: { unread: 0 },
      meta: {},
    }),
  };
}

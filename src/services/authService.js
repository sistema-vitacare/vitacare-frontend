// Sessão simulada. Na integração, `startDemoSession` dá lugar ao login real
// (POST /auth/login) e `endSession` ao logout (POST /auth/logout).
import { permissionsFor } from '../constants/permissions.js';
import { organization } from '../data/mocks/organization.js';
import { platformAdmin, platformOrganization } from '../data/mocks/platform.js';
import { users } from '../data/mocks/users.js';
import { mockRequest, notFoundError, respond } from './mockApi.js';

// Prazo absoluto da sessão normal da API.
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export const DEMO_PROFILES = [
  'admin',
  'professional',
  'caregiver',
  'family',
  'platform_admin',
];

function demoAccount(profileCode) {
  if (profileCode === 'platform_admin') {
    return { user: platformAdmin, organization: platformOrganization };
  }
  const user = users.find(
    (candidate) =>
      candidate.profile.code === profileCode && candidate.status === 'active',
  );
  return user ? { user, organization } : null;
}

function buildSession({ user, organization: org }) {
  return {
    state: 'authenticated',
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
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
  };
}

export function startDemoSession(profileCode) {
  return mockRequest(() => {
    const account = demoAccount(profileCode);
    if (!account) {
      throw notFoundError('Não há usuário de demonstração para este perfil.');
    }
    return respond(buildSession(account));
  });
}

export function endSession() {
  return mockRequest(() => respond(null));
}

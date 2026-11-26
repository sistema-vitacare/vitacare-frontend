// Usuários no formato da API (`users-listar.md` e `users-consultar.md`), para
// os testes de usuários e do roteador. Nenhuma regra do backend é aplicada: a
// API filtra, pagina e mascara; o teste diz o que ela devolveria.
import { apiFailure, apiPage } from '../apiStub.js';
import { demoUser } from './sessions.js';

// Nomes dos perfis como a API os devolve, sem acento.
const PROFILE_NAMES = {
  admin: 'Administrador',
  professional: 'Profissional de saude',
  caregiver: 'Cuidador',
  family: 'Familiar',
};

// CPF como a listagem o devolve: só os seis dígitos do meio.
const LISTED_CPF = '***.982.247-**';

const helena = demoUser('admin');

/** O administrador da sessão dos testes, para a própria conta. */
export const HELENA = {
  id: helena.id,
  name: helena.name,
  email: helena.email,
  cpf: helena.cpf,
  profileCode: 'admin',
  lastAccessAt: '2026-11-08T11:17:00.000Z',
};
export const ANA = {
  id: '8f14e45f-ceea-4b7a-9f0b-1c2d3e4f5a6b',
  name: 'Ana Exemplo',
  email: 'ana@example.test',
  cpf: '52998224725',
  profileCode: 'caregiver',
};
export const BRUNO = {
  id: '9a25f560-dffb-4c8b-8a1c-2d3e4f5a6b7c',
  name: 'Bruno Exemplo',
  email: 'bruno@example.test',
  cpf: '24681357928',
  phone: '(16) 99123-4567',
  profileCode: 'professional',
  lastAccessAt: '2026-11-09T13:00:00.000Z',
};
export const CARLA = {
  id: 'ab36a671-e00c-4d9a-9b2d-3e4f5a6b7c8d',
  name: 'Carla Exemplo',
  email: 'carla@example.test',
  cpf: '13579246828',
  profileCode: 'family',
  status: 'inactive',
  deletedAt: '2026-11-07T18:00:00.000Z',
};

/** Convite pendente por senha provisória, de 24 h. */
export function passwordInvitation(overrides = {}) {
  return {
    channel: 'temporary_password',
    status: 'pending',
    expiresAt: '2026-11-04T12:30:00.000Z',
    sentAt: null,
    ...overrides,
  };
}

/** Convite pendente por link no e-mail, de 72 h. */
export function emailInvitation(overrides = {}) {
  return {
    channel: 'email',
    status: 'pending',
    expiresAt: '2026-11-06T12:30:00.000Z',
    sentAt: '2026-11-03T12:30:05.000Z',
    ...overrides,
  };
}

/**
 * Usuário como `GET /users/{userId}` o devolve, com o CPF inteiro. Sem
 * `status`, o usuário é ativo, ou pendente quando traz convite.
 */
export function apiUser({
  id,
  name,
  email,
  cpf,
  phone = null,
  profileCode,
  invitation = null,
  status = invitation ? 'pending' : 'active',
  lastAccessAt = null,
  deletedAt = null,
}) {
  return {
    id,
    name,
    email,
    cpf,
    phone,
    status,
    profile: { code: profileCode, name: PROFILE_NAMES[profileCode] },
    invitation,
    lastAccessAt,
    createdAt: '2026-11-03T12:30:00.000Z',
    updatedAt: '2026-11-03T12:30:00.000Z',
    deletedAt,
  };
}

/** Item de `GET /users`, com o CPF mascarado como a listagem o devolve. */
export const listedUser = (user) => ({ ...user, cpf: LISTED_CPF });

/**
 * `GET /users` com a página dada e `GET /users/{userId}` com cada usuário
 * dela; outro id responde `404 USER_NOT_FOUND`, como o de outra organização.
 */
export function userRoutes(users, { total } = {}) {
  return {
    'GET /users': () => apiPage(users.map(listedUser), { total }),
    'GET /users/:userId': ({ params }) => {
      const user = users.find((item) => item.id === params.userId);
      return user
        ? { data: user, meta: {} }
        : apiFailure(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    },
  };
}

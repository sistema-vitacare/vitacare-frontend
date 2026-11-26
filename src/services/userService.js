// Usuários da organização pelas rotas `users` da API e a senha temporária
// pela rota `auth` (manual `users-*.md` e `auth-redefinir-senha-usuario.md`,
// conferido em 26/11/2026 no commit `3beebe3` do backend). A API confere a
// permissão, o limite e a vigência do plano, gera a senha ou envia o link e
// escolhe o canal do convite quando a tela não o pede.
import { apiGet, apiPatch, apiPath, apiPost } from './apiClient.js';

// A API recusa a ação porque o usuário já não está como a tela o carregou
// (outra pessoa ou outra aba mudou a situação dele): tentar de novo falharia
// igual, então a tela recarrega e mostra a mensagem.
export const USER_STALE_CODES = Object.freeze([
  'USER_ALREADY_INACTIVE',
  'USER_ALREADY_ACTIVE',
  'USER_INVITATION_ALREADY_ACCEPTED',
  'USER_INACTIVE',
  'AUTH_USER_NOT_FOUND',
]);

/** Usuários com os filtros da tela, a página e o limite; o CPF vem mascarado. */
export function listUsers(query = {}) {
  return apiGet('/users', query);
}

/** Usuário com o CPF inteiro e a situação do convite. */
export function getUser(userId) {
  return apiGet(apiPath`/users/${userId}`);
}

/**
 * Cadastro com convite. Sem `channel`, vale o canal do servidor: a senha
 * provisória vem na resposta uma única vez, ou o link vai por e-mail e a
 * resposta traz só a `meta.message`.
 */
export function createUser(body) {
  return apiPost('/users', body);
}

/** Só os campos enviados mudam; `phone: null` apaga o telefone. */
export function updateUser(userId, body) {
  return apiPatch(apiPath`/users/${userId}`, body);
}

export function changeUserProfile(userId, body) {
  return apiPatch(apiPath`/users/${userId}/profile`, body);
}

export function deactivateUser(userId) {
  return apiPost(apiPath`/users/${userId}/deactivate`);
}

export function reactivateUser(userId) {
  return apiPost(apiPath`/users/${userId}/reactivate`);
}

/**
 * Reemissão do convite. Sem canal, a requisição vai sem corpo, e vale o
 * canal do servidor; com `channel`, o convite troca de canal.
 */
export function reissueInvitation(userId, body) {
  return apiPost(apiPath`/users/${userId}/invitation`, body);
}

/** Senha provisória de 24 h para outro usuário ativo da organização. */
export function issueTemporaryPassword(userId) {
  return apiPost(apiPath`/auth/users/${userId}/temporary-password`);
}

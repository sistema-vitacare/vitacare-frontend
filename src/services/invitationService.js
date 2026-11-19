// Convite por link (manual da API, `auth-convite-consultar.md` e
// `auth-convite-aceitar.md`, conferido em 19/11/2026 no commit `3beebe3` do
// backend). As duas rotas são públicas: o token do e-mail vai no corpo, e
// nunca no endereço da API, para não aparecer em log de acesso.
import { apiPost } from './apiClient.js';

export const INVITATION_ERRORS = Object.freeze({
  // Inválido, vencido, já usado ou revogado: a API não diz qual, de propósito.
  INVALID: 'AUTH_INVITATION_INVALID_OR_EXPIRED',
});

/** Quem foi convidado, para qual organização e perfil, e até quando. */
export function inspectInvitation(token) {
  return apiPost('/auth/invitations/inspect', { token }, { auth: false });
}

/** Cadastra a senha; o aceite não abre sessão, e o login vem depois. */
export function acceptInvitation({ token, newPassword }) {
  return apiPost(
    '/auth/invitations/accept',
    { token, newPassword },
    { auth: false },
  );
}

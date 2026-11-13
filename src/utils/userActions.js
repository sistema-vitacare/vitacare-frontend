// Situação exibida e ações de um usuário na tela de usuários. Cada ação
// segue a permissão da rota que ela chama; a própria conta só se edita,
// porque a API recusa perfil, situação e senha provisória dela (409).
import { PERMISSIONS as P } from '../constants/permissions.js';

const INVITATION_SITUATIONS = {
  pending: 'invited',
  expired: 'expired',
  invalidated: 'invalidated',
};

/** `active`, `invited`, `expired`, `invalidated` ou `inactive`. */
export function userSituation(user) {
  if (user.status !== 'pending') {
    return user.status;
  }
  return INVITATION_SITUATIONS[user.invitation?.status] ?? 'invited';
}

/** Ações na ordem em que a página do usuário as mostra. */
export function userActions(user, { viewerId, can }) {
  const self = user.id === viewerId;
  const pending = user.status === 'pending';
  const actions = [];
  const offer = (action, allowed) => {
    if (allowed) {
      actions.push(action);
    }
  };

  offer('edit', can(P.USERS_UPDATE));
  offer('changeProfile', !self && can(P.USERS_CHANGE_PROFILE));
  offer('reissueInvitation', pending && can(P.USERS_CREATE));
  // Quem não recebe o e-mail do link ganha a senha provisória na reemissão.
  offer(
    'reissueWithPassword',
    pending && user.invitation?.channel === 'email' && can(P.USERS_CREATE),
  );
  offer(
    'temporaryPassword',
    !self && user.status === 'active' && can(P.USERS_RESET_PASSWORD),
  );
  offer(
    'deactivate',
    !self && user.status !== 'inactive' && can(P.USERS_CHANGE_STATUS),
  );
  offer(
    'reactivate',
    !self && user.status === 'inactive' && can(P.USERS_CHANGE_STATUS),
  );
  return actions;
}

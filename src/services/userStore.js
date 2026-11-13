// Estado simulado dos usuários da organização: cadastro, edição, troca de
// perfil, convite e situação, como a API guardaria no banco. É a fonte dos
// usuários para o login, os vínculos de cuidado e o profissional
// responsável, para que um usuário inativado ou com perfil novo valha em
// todas as telas.
import { users as seedUsers } from '../data/mocks/users.js';
import { registerMockState } from './mockApi.js';

let createdUsers = [];
let userChanges = new Map();

registerMockState(() => {
  createdUsers = [];
  userChanges = new Map();
});

export function allUsers() {
  return [
    ...seedUsers.map((user) => ({ ...user, ...userChanges.get(user.id) })),
    ...createdUsers,
  ];
}

export function findUser(userId) {
  return allUsers().find((user) => user.id === userId) ?? null;
}

export function addUser(user) {
  createdUsers = [...createdUsers, user];
}

export function changeUser(userId, changes) {
  if (createdUsers.some((user) => user.id === userId)) {
    createdUsers = createdUsers.map((user) =>
      user.id === userId ? { ...user, ...changes } : user,
    );
    return;
  }
  userChanges.set(userId, { ...userChanges.get(userId), ...changes });
}

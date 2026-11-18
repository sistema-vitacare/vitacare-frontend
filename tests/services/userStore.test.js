// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { users } from '../../src/data/mocks/users.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  addUser,
  allUsers,
  changeUser,
  findUser,
} from '../../src/services/userStore.js';

const HELENA = 'f43fdabb-62fc-569d-aa6b-02800cd5b1cd';

const newUser = {
  ...users[0],
  id: 'u5e70000-0000-5000-8000-000000000001',
  name: 'Ana Nova',
  email: 'ana.nova@ipeamarelo.example',
  status: 'pending',
};

describe('estado dos usuários', () => {
  afterEach(() => resetMockState());

  it('começa com os usuários simulados', () => {
    expect(allUsers()).toEqual(users);
    expect(findUser(HELENA).name).toBe('Helena Vasconcelos');
  });

  it('devolve nulo para usuário que não existe', () => {
    expect(findUser('inexistente')).toBeNull();
  });

  it('acrescenta o usuário cadastrado na sessão ao fim da lista', () => {
    addUser(newUser);

    expect(allUsers()).toHaveLength(users.length + 1);
    expect(findUser(newUser.id)).toEqual(newUser);
  });

  it('aplica as mudanças ao simulado e ao cadastrado na sessão', () => {
    addUser(newUser);
    changeUser(HELENA, { phone: '(16) 99999-0000' });
    changeUser(newUser.id, { status: 'active' });

    expect(findUser(HELENA).phone).toBe('(16) 99999-0000');
    expect(findUser(newUser.id).status).toBe('active');
  });

  it('volta ao início com resetMockState', () => {
    addUser(newUser);
    changeUser(HELENA, { name: 'Outra' });
    resetMockState();

    expect(allUsers()).toEqual(users);
  });
});

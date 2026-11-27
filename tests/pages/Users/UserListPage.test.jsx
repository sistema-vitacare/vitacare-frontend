import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, userPath } from '../../../src/constants/routes.js';
import { TENANT_PROFILES } from '../../../src/constants/users.js';
import { profileLabels } from '../../../src/data/profiles.js';
import { temporaryPasswordContent as passwordField } from '../../../src/data/temporaryPassword.js';
import {
  invitationResultContent as result,
  userFieldErrors,
  userFormContent as form,
  userListContent as content,
} from '../../../src/data/userPages.js';
import UserListPage from '../../../src/pages/Users/UserListPage.jsx';
import { apiFailure, apiPage, apiStub, reply } from '../../support/apiStub.js';
import {
  ENTERPRISE,
  apiOrganizationPlan,
} from '../../support/fixtures/organizations.js';
import {
  ANA,
  BRUNO,
  CARLA,
  HELENA,
  apiUser,
  listedUser,
  passwordInvitation,
} from '../../support/fixtures/users.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { prefixesOf, typeLikeBrowser } from '../../support/browserTyping.js';

const USERS = [
  apiUser({
    ...ANA,
    invitation: passwordInvitation({ status: 'expired' }),
  }),
  apiUser(BRUNO),
  apiUser(CARLA),
  apiUser(HELENA),
];
const COUNTS = { admin: 1, professional: 3, caregiver: 5, family: 2 };
const CREATED = apiUser({
  id: 'bc47b782-f11d-4eab-8c3e-4f5a6b7c8d9e',
  name: 'Daniel Exemplo',
  email: 'daniel@example.test',
  cpf: '52998224725',
  profileCode: 'caregiver',
  invitation: passwordInvitation({ expiresAt: '2026-11-11T15:00:00.000Z' }),
});
const PASSWORD = 'X7hK2mPq9RtV4wYz8NcB';

/**
 * A lista e os contadores usam a mesma rota: os contadores pedem só os
 * ativos de um perfil, com limite 1, e leem o `total`.
 */
function userRoutes({ users = USERS, counts = COUNTS } = {}) {
  return {
    'GET /users': ({ query }) =>
      query.limit === '1'
        ? apiPage([], { limit: 1, total: counts[query.profileCode] })
        : apiPage(users.map(listedUser)),
    'GET /organizations/me/plan': () =>
      apiOrganizationPlan({
        plan: ENTERPRISE,
        usage: { users: 11, patients: 40 },
      }),
  };
}

function listQuery() {
  return apiStub()
    .requests.filter(
      (request) => request.key === 'GET /users' && request.query.limit !== '1',
    )
    .at(-1).query;
}

function renderList({ path = PATHS.USERS, width } = {}) {
  return renderPage(
    [
      { path: PATHS.USERS, element: <UserListPage /> },
      { path: PATHS.USER_DETAIL, element: <p>Página do usuário</p> },
    ],
    { profile: 'admin', path, width },
  );
}

function rowOf(name) {
  return screen.getByText(name).closest('tr');
}

async function openNewUser() {
  fireEvent.click(await screen.findByRole('button', { name: content.newUser }));
  return screen.findByRole('dialog', { name: form.newTitle });
}

function fill(dialog, values) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(within(dialog).getByLabelText(label, { exact: false }), {
      target: { value },
    });
  }
}

function chooseProfile(dialog, code) {
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /Perfil/ }));
  fireEvent.click(screen.getByRole('option', { name: profileLabels[code] }));
}

const newUser = {
  [form.name]: 'Daniel Exemplo',
  [form.email]: 'daniel@example.test',
  [form.cpf]: '529.982.247-25',
};

async function createWithPassword() {
  apiStub().use({
    'POST /users': () =>
      reply(201, {
        data: {
          channel: 'temporary_password',
          temporaryPassword: PASSWORD,
          expiresAt: CREATED.invitation.expiresAt,
          user: CREATED,
        },
        meta: {},
      }),
  });
  const dialog = await openNewUser();
  fill(dialog, newUser);
  chooseProfile(dialog, 'caregiver');
  fireEvent.click(within(dialog).getByRole('button', { name: form.save }));
  return screen.findByRole('dialog', { name: result.passwordTitle });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-10T15:00:00.000Z'));
  apiStub().use(userRoutes());
});

afterEach(() => {
  resetViewport();
  vi.useRealTimers();
  delete navigator.clipboard;
  delete document.execCommand;
});

function stubClipboard(clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
}

describe('UserListPage', () => {
  it('lista os usuários da API com perfil, situação e último acesso', async () => {
    renderList();

    expect(
      await screen.findByText(content.subtitle(USERS.length)),
    ).toBeInTheDocument();
    const helena = rowOf(HELENA.name);
    expect(within(helena).getByText('Administrador')).toBeInTheDocument();
    expect(within(helena).getByText('Ativo')).toBeInTheDocument();
    expect(
      within(rowOf(ANA.name)).getByText('Convite vencido'),
    ).toBeInTheDocument();
    expect(within(rowOf(CARLA.name)).getByText('Inativo')).toBeInTheDocument();
  });

  // Minimização: a lista não expõe o CPF, que a API manda mascarado; ele só
  // aparece na página do usuário.
  it('não mostra CPF na lista', async () => {
    renderList();
    await screen.findByText(HELENA.name);

    expect(screen.queryByText(/\d{3}\.\d{3}/)).not.toBeInTheDocument();
  });

  it('conta os ativos de cada perfil pelo total da API e mostra as vagas do plano', async () => {
    renderList();
    const region = await screen.findByRole('region', {
      name: content.countersLabel,
    });

    for (const code of TENANT_PROFILES) {
      const counter = (
        await within(region).findByText(profileLabels[code])
      ).closest('li');
      await waitFor(() =>
        expect(counter).toHaveTextContent(String(COUNTS[code])),
      );
    }
    expect(
      await screen.findByText(content.seats(11, ENTERPRISE.userLimit)),
    ).toBeInTheDocument();
    const counted = apiStub()
      .requests.filter((request) => request.query.limit === '1')
      .map((request) => request.query);
    expect(counted).toHaveLength(TENANT_PROFILES.length);
    expect(counted).toContainEqual({
      status: 'active',
      profileCode: 'family',
      limit: '1',
    });
  });

  it('manda à API o perfil e a situação do endereço e guarda a busca nele', async () => {
    const router = renderList({
      path: `${PATHS.USERS}?perfil=caregiver&situacao=pending`,
    });
    await screen.findByText(ANA.name);

    expect(listQuery()).toMatchObject({
      profileCode: 'caregiver',
      status: 'pending',
    });

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'ana' },
    });
    await waitFor(() =>
      expect(router.state.location.search).toContain('busca=ana'),
    );
    expect(router.state.location.search).toContain('perfil=caregiver');
    await waitFor(() => expect(listQuery().search).toBe('ana'));
  });

  it('guarda no campo cada letra da busca na hora em que ela entra e manda o texto inteiro à API', async () => {
    renderList();
    await screen.findByText(ANA.name);

    const field = screen.getByLabelText(content.searchLabel);
    expect(typeLikeBrowser(field, 'Fictícia')).toEqual(prefixesOf('Fictícia'));
    await waitFor(() => expect(listQuery().search).toBe('Fictícia'));
  });

  it('mostra cartões no celular', async () => {
    renderList({ width: 375 });

    expect(await screen.findByText(HELENA.name)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('cadastra sem canal, mostra a senha da API uma única vez e abre o usuário ao fechar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const router = renderList();

    const shown = await createWithPassword();

    expect(apiStub().last('POST /users').body).toEqual({
      name: 'Daniel Exemplo',
      email: 'daniel@example.test',
      cpf: '529.982.247-25',
      profileCode: 'caregiver',
    });
    const password = within(shown).getByLabelText(passwordField.label);
    expect(password.value).toBe(PASSWORD);
    expect(
      within(shown).getByText(result.validUntil('11/11/2026 às 12:00')),
    ).toBeInTheDocument();
    fireEvent.click(
      within(shown).getByRole('button', { name: passwordField.copy }),
    );
    expect(
      await within(shown).findByText(passwordField.copied),
    ).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(PASSWORD);

    fireEvent.click(within(shown).getByRole('button', { name: result.close }));
    expect(await screen.findByText('Página do usuário')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(userPath(CREATED.id));
  });

  it('mostra a mensagem da API quando o convite vai por e-mail, sem senha', async () => {
    const message =
      'Convite enviado ao e-mail do usuário. O link vale até 13/11/2026 às 12:00 (horário de Brasília).';
    apiStub().use({
      'POST /users': () =>
        reply(201, {
          data: {
            channel: 'email',
            expiresAt: '2026-11-13T15:00:00.000Z',
            delivery: { status: 'sent' },
            user: CREATED,
          },
          meta: { message },
        }),
    });
    renderList();
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    const shown = await screen.findByRole('dialog', {
      name: result.emailTitle,
    });
    expect(within(shown).getByText(message)).toBeInTheDocument();
    expect(
      within(shown).queryByLabelText(passwordField.label),
    ).not.toBeInTheDocument();
  });

  // Fora de contexto seguro (HTTP sem localhost), o navegador não oferece
  // `navigator.clipboard`.
  it('copia pelo campo selecionado fora de contexto seguro', async () => {
    stubClipboard(undefined);
    document.execCommand = vi.fn(() => true);
    renderList();
    const shown = await createWithPassword();

    fireEvent.click(
      within(shown).getByRole('button', { name: passwordField.copy }),
    );

    expect(
      await within(shown).findByText(passwordField.copied),
    ).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  // Sem a permissão de escrita na área de transferência, o navegador recusa
  // o `writeText`; a cópia pelo campo ainda funciona.
  it('copia pelo campo quando o navegador recusa a área de transferência', async () => {
    stubClipboard({
      writeText: vi.fn().mockRejectedValue(new Error('negado')),
    });
    document.execCommand = vi.fn(() => true);
    renderList();
    const shown = await createWithPassword();

    fireEvent.click(
      within(shown).getByRole('button', { name: passwordField.copy }),
    );

    expect(
      await within(shown).findByText(passwordField.copied),
    ).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('aponta no campo o e-mail que a API diz já usado na organização', async () => {
    apiStub().use({
      'POST /users': () =>
        apiFailure(
          409,
          'USER_DUPLICATE_EMAIL',
          'Já existe um usuário com este e-mail na organização. Se ele estiver inativo, reative-o.',
          [{ field: 'email', code: 'DUPLICATE' }],
        ),
    });
    renderList();
    const dialog = await openNewUser();
    fill(dialog, { ...newUser, [form.email]: CARLA.email });
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(
      await within(dialog).findByText(userFieldErrors.email.DUPLICATE),
    ).toBeInTheDocument();
  });

  it('mostra a mensagem da API quando o plano não tem vaga', async () => {
    const message =
      'O limite de usuários do plano foi atingido. Inative um usuário ou solicite a mudança de plano.';
    apiStub().use({
      'POST /users': () => apiFailure(409, 'USER_PLAN_LIMIT_REACHED', message),
    });
    renderList();
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
  });
});

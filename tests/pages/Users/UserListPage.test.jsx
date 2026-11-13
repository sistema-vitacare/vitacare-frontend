import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { TENANT_PROFILES } from '../../../src/constants/users.js';
import { organization } from '../../../src/data/mocks/organization.js';
import { BASIC_PLAN, ENTERPRISE_PLAN } from '../../../src/data/mocks/plans.js';
import { profileLabels } from '../../../src/data/profiles.js';
import {
  invitationResultContent as result,
  userFieldErrors,
  userFormContent as form,
  userListContent as content,
} from '../../../src/data/userPages.js';
import UserListPage from '../../../src/pages/Users/UserListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { changeTerm } from '../../../src/services/organizationStore.js';
import { allUsers } from '../../../src/services/userStore.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const PATRICIA = '2fb0cec5-0e79-5ae3-9dd8-bea87be4292f';

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
  [form.name]: 'Ana Nova',
  [form.email]: 'ana.nova@ipeamarelo.example',
  [form.cpf]: '529.982.247-25',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-10T15:00:00.000Z'));
});

afterEach(() => {
  resetMockState();
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
  it('lista os usuários com perfil, situação e último acesso', async () => {
    renderList();

    expect(
      await screen.findByText(content.subtitle(allUsers().length)),
    ).toBeInTheDocument();
    const helena = rowOf('Helena Vasconcelos');
    expect(within(helena).getByText('Administrador')).toBeInTheDocument();
    expect(within(helena).getByText('Ativo')).toBeInTheDocument();
    expect(
      within(rowOf('Edna Carvalho Pires')).getByText('Convite vencido'),
    ).toBeInTheDocument();
    expect(
      within(rowOf('Patrícia Lemos Duarte')).getByText('Inativo'),
    ).toBeInTheDocument();
  });

  // Minimização: a lista não expõe o CPF; ele só aparece na página do
  // usuário, como na API.
  it('não mostra CPF na lista', async () => {
    renderList();
    await screen.findByText('Helena Vasconcelos');

    expect(screen.queryByText(/\d{3}\.\d{3}/)).not.toBeInTheDocument();
  });

  it('conta os ativos de cada perfil e as vagas do plano em uso', async () => {
    renderList();
    const region = await screen.findByRole('region', {
      name: content.countersLabel,
    });

    for (const code of TENANT_PROFILES) {
      const total = allUsers().filter(
        (user) => user.status === 'active' && user.profile.code === code,
      ).length;
      const counter = (
        await within(region).findByText(profileLabels[code])
      ).closest('li');
      await waitFor(() => expect(counter).toHaveTextContent(String(total)));
    }
    const used = allUsers().filter((user) =>
      ['pending', 'active'].includes(user.status),
    ).length;
    expect(
      await screen.findByText(content.seats(used, ENTERPRISE_PLAN.userLimit)),
    ).toBeInTheDocument();
  });

  it('abre com perfil e situação do endereço e guarda a busca nele', async () => {
    const router = renderList({
      path: `${PATHS.USERS}?perfil=caregiver&situacao=pending`,
    });

    expect(await screen.findByText('Edna Carvalho Pires')).toBeInTheDocument();
    expect(screen.queryByText('Juliana Bastos')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'edna' },
    });
    await waitFor(() =>
      expect(router.state.location.search).toContain('busca=edna'),
    );
    expect(router.state.location.search).toContain('perfil=caregiver');
  });

  it('mostra cartões no celular', async () => {
    renderList({ width: 375 });

    expect(await screen.findByText('Helena Vasconcelos')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('cadastra, mostra a senha uma única vez e abre o usuário ao fechar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const router = renderList();
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });
    const password = within(shown).getByLabelText(result.passwordLabel);
    expect(password.value).toHaveLength(20);
    expect(
      within(shown).getByText(result.validUntil('11/11/2026 às 12:00')),
    ).toBeInTheDocument();
    fireEvent.click(within(shown).getByRole('button', { name: result.copy }));
    expect(await within(shown).findByText(result.copied)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(password.value);

    fireEvent.click(within(shown).getByRole('button', { name: result.close }));
    expect(await screen.findByText('Página do usuário')).toBeInTheDocument();
    const created = allUsers().find((user) => user.name === 'Ana Nova');
    expect(router.state.location.pathname).toBe(`${PATHS.USERS}/${created.id}`);
  });

  // Pelo IP sem HTTPS, o navegador não oferece `navigator.clipboard`.
  it('copia pelo campo selecionado fora de contexto seguro', async () => {
    stubClipboard(undefined);
    document.execCommand = vi.fn(() => true);
    renderList();
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'family');
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));
    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });

    fireEvent.click(within(shown).getByRole('button', { name: result.copy }));

    expect(await within(shown).findByText(result.copied)).toBeInTheDocument();
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
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'family');
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));
    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });

    fireEvent.click(within(shown).getByRole('button', { name: result.copy }));

    expect(await within(shown).findByText(result.copied)).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('aponta no campo o e-mail já usado na organização', async () => {
    renderList();
    const dialog = await openNewUser();
    const patricia = allUsers().find((user) => user.id === PATRICIA);
    fill(dialog, { ...newUser, [form.email]: patricia.email });
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(
      await within(dialog).findByText(userFieldErrors.email.DUPLICATE),
    ).toBeInTheDocument();
  });

  it('mostra a mensagem da API quando o plano não tem vaga', async () => {
    changeTerm(organization.id, { planId: BASIC_PLAN.id });
    renderList();
    const dialog = await openNewUser();
    fill(dialog, newUser);
    chooseProfile(dialog, 'caregiver');

    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(
      await within(dialog).findByText(
        'O limite de usuários do plano foi atingido. Inative um usuário ou solicite a mudança de plano.',
      ),
    ).toBeInTheDocument();
  });
});

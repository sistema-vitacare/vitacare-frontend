import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, userPath } from '../../../src/constants/routes.js';
import { profileLabels } from '../../../src/data/profiles.js';
import {
  invitationResultContent as result,
  profileDialogContent as profileDialog,
  userDetailContent as content,
  userFormContent as form,
} from '../../../src/data/userPages.js';
import UserDetailPage from '../../../src/pages/Users/UserDetailPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { setInvitationEmailEnabled } from '../../../src/services/userService.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const HELENA = 'f43fdabb-62fc-569d-aa6b-02800cd5b1cd';
const RAFAEL = 'f6b21c50-000b-5e70-878b-b5e7f5f9a410';
const ROSANGELA = '828a4d5b-6754-54c6-8b60-63833149e502';
const EDNA = '8ffa0d80-db2f-52a7-a275-08f89cce49c1';

function renderUser(userId) {
  return renderPage(
    [
      { path: PATHS.USER_DETAIL, element: <UserDetailPage /> },
      { path: PATHS.USERS, element: <p>Lista de usuários</p> },
    ],
    { profile: 'admin', path: userPath(userId) },
  );
}

function section(title) {
  return screen.getByRole('heading', { name: title }).closest('.MuiCard-root');
}

function value(container, label) {
  return within(container).getByText(label).nextElementSibling;
}

const action = (name) => screen.getByRole('button', { name });
const queryAction = (name) => screen.queryByRole('button', { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T15:00:00.000Z'));
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
});

describe('UserDetailPage', () => {
  it('mostra os dados com o CPF inteiro e o convite vencido do convidado', async () => {
    renderUser(EDNA);

    expect(
      await screen.findByRole('heading', { name: 'Edna Carvalho Pires' }),
    ).toBeInTheDocument();
    const data = section(content.dataTitle);
    expect(value(data, content.fields.cpf)).toHaveTextContent('743.063.185-16');
    expect(value(data, content.fields.profile)).toHaveTextContent(
      profileLabels.caregiver,
    );
    const invitation = section(content.invitationTitle);
    expect(
      value(invitation, content.invitationFields.channel),
    ).toHaveTextContent(content.channelLabels.temporary_password);
    expect(
      within(invitation).getByText(content.invitationHint.expired),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Convite vencido').length).toBeGreaterThan(0);
  });

  it('não mostra o convite de quem já está ativo', async () => {
    renderUser(RAFAEL);
    await screen.findByRole('heading', { name: 'Rafael Moura Brandão' });

    expect(
      screen.queryByRole('heading', { name: content.invitationTitle }),
    ).not.toBeInTheDocument();
  });

  it('oferece as ações do usuário ativo', async () => {
    renderUser(RAFAEL);
    await screen.findByRole('heading', { name: 'Rafael Moura Brandão' });

    for (const name of [
      content.actions.edit,
      content.actions.changeProfile,
      content.actions.temporaryPassword,
      content.actions.deactivate,
    ]) {
      expect(action(name)).toBeInTheDocument();
    }
    expect(queryAction(content.actions.reissueInvitation)).toBeNull();
  });

  it('na própria conta, oferece só a edição', async () => {
    renderUser(HELENA);
    await screen.findByRole('heading', { name: 'Helena Vasconcelos' });

    expect(action(content.actions.edit)).toBeInTheDocument();
    expect(queryAction(content.actions.changeProfile)).toBeNull();
    expect(queryAction(content.actions.deactivate)).toBeNull();
    expect(queryAction(content.actions.temporaryPassword)).toBeNull();
  });

  it('inativa com confirmação e passa a oferecer a reativação', async () => {
    renderUser(RAFAEL);
    fireEvent.click(
      await screen.findByRole('button', { name: content.actions.deactivate }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: content.deactivate.title,
    });
    expect(
      within(dialog).getByText(content.deactivate.text('Rafael Moura Brandão')),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: content.deactivate.confirm }),
    );

    expect(
      await screen.findByRole('button', { name: content.actions.reactivate }),
    ).toBeInTheDocument();
    expect(
      value(section(content.dataTitle), content.fields.status),
    ).toHaveTextContent('Inativo');
  });

  it('reemite o convite e mostra a nova senha uma única vez', async () => {
    renderUser(EDNA);
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.reissueInvitation,
      }),
    );

    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });
    const password = within(shown).getByLabelText(result.passwordLabel).value;
    expect(password).toHaveLength(20);
    fireEvent.click(within(shown).getByRole('button', { name: result.close }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.queryByDisplayValue(password)).not.toBeInTheDocument();
    expect(
      value(section(content.dataTitle), content.fields.status),
    ).toHaveTextContent('Convidado');
  });

  it('gera senha provisória para o usuário ativo', async () => {
    renderUser(RAFAEL);
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.temporaryPassword,
      }),
    );

    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });
    expect(
      within(shown).getByLabelText(result.passwordLabel).value,
    ).toHaveLength(20);
  });

  it('com o SMTP ligado, reemite por link e mostra a mensagem da API', async () => {
    setInvitationEmailEnabled(true);
    renderUser(EDNA);
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.reissueInvitation,
      }),
    );

    const shown = await screen.findByRole('dialog', {
      name: result.emailTitle,
    });
    expect(
      within(shown).getByText(
        'Convite enviado ao e-mail do usuário. O link vale até 13/11/2026 às 12:00 (horário de Brasília).',
      ),
    ).toBeInTheDocument();
    expect(within(shown).queryByLabelText(result.passwordLabel)).toBeNull();
    fireEvent.click(within(shown).getByRole('button', { name: result.close }));

    const invitation = await waitFor(() => section(content.invitationTitle));
    await waitFor(() =>
      expect(
        value(invitation, content.invitationFields.channel),
      ).toHaveTextContent(content.channelLabels.email),
    );
    expect(action(content.actions.reissueWithPassword)).toBeInTheDocument();
  });

  it('altera o perfil com o aviso dos vínculos de cuidado', async () => {
    renderUser(ROSANGELA);
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.changeProfile,
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: profileDialog.title,
    });
    expect(within(dialog).getByText(profileDialog.warning)).toBeInTheDocument();

    fireEvent.mouseDown(
      within(dialog).getByRole('combobox', { name: profileDialog.profile }),
    );
    fireEvent.click(
      screen.getByRole('option', { name: profileLabels.professional }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: profileDialog.save }),
    );

    await waitFor(() =>
      expect(
        value(section(content.dataTitle), content.fields.profile),
      ).toHaveTextContent(profileLabels.professional),
    );
  });

  it('edita os dados no diálogo', async () => {
    renderUser(RAFAEL);
    fireEvent.click(
      await screen.findByRole('button', { name: content.actions.edit }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.editTitle });

    fireEvent.change(within(dialog).getByLabelText(form.phone), {
      target: { value: '(16) 99999-0000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    await waitFor(() =>
      expect(
        value(section(content.dataTitle), content.fields.phone),
      ).toHaveTextContent('(16) 99999-0000'),
    );
  });
});

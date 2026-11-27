import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, userPath } from '../../../src/constants/routes.js';
import { profileLabels } from '../../../src/data/profiles.js';
import { temporaryPasswordContent as passwordField } from '../../../src/data/temporaryPassword.js';
import {
  invitationResultContent as result,
  profileDialogContent as profileDialog,
  userDetailContent as content,
  userFormContent as form,
} from '../../../src/data/userPages.js';
import UserDetailPage from '../../../src/pages/Users/UserDetailPage.jsx';
import { apiFailure, apiStub, reply } from '../../support/apiStub.js';
import {
  ANA,
  BRUNO,
  HELENA,
  apiUser,
  emailInvitation,
  passwordInvitation,
} from '../../support/fixtures/users.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DETAIL = 'GET /users/:userId';
const PASSWORD = 'X7hK2mPq9RtV4wYz8NcB';
const INACTIVE_MESSAGE = 'O usuário já está inativo.';

// O usuário que a API devolve agora; as ações do teste o trocam, como o
// banco faria.
let current;

function serve(user) {
  current = user;
  apiStub().use({ [DETAIL]: () => ({ data: current, meta: {} }) });
}

function renderUser(user) {
  serve(user);
  return renderPage(
    [
      { path: PATHS.USER_DETAIL, element: <UserDetailPage /> },
      { path: PATHS.USERS, element: <p>Lista de usuários</p> },
    ],
    { profile: 'admin', path: userPath(user.id) },
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
const loads = () =>
  apiStub().requests.filter((request) => request.key === DETAIL).length;

async function confirmDeactivation() {
  fireEvent.click(
    await screen.findByRole('button', { name: content.actions.deactivate }),
  );
  const dialog = await screen.findByRole('dialog', {
    name: content.deactivate.title,
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: content.deactivate.confirm }),
  );
  return dialog;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T15:00:00.000Z'));
});

afterEach(() => {
  resetViewport();
  vi.useRealTimers();
});

describe('UserDetailPage', () => {
  it('mostra os dados da API com o CPF inteiro e o convite vencido do convidado', async () => {
    renderUser(
      apiUser({
        ...ANA,
        invitation: passwordInvitation({ status: 'expired' }),
      }),
    );

    expect(
      await screen.findByRole('heading', { name: ANA.name }),
    ).toBeInTheDocument();
    expect(apiStub().last(DETAIL).params.userId).toBe(ANA.id);
    const data = section(content.dataTitle);
    expect(value(data, content.fields.cpf)).toHaveTextContent('529.982.247-25');
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
    renderUser(apiUser(BRUNO));
    await screen.findByRole('heading', { name: BRUNO.name });

    expect(
      screen.queryByRole('heading', { name: content.invitationTitle }),
    ).not.toBeInTheDocument();
  });

  it('oferece as ações do usuário ativo', async () => {
    renderUser(apiUser(BRUNO));
    await screen.findByRole('heading', { name: BRUNO.name });

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
    renderUser(apiUser(HELENA));
    await screen.findByRole('heading', { name: HELENA.name });

    expect(action(content.actions.edit)).toBeInTheDocument();
    expect(queryAction(content.actions.changeProfile)).toBeNull();
    expect(queryAction(content.actions.deactivate)).toBeNull();
    expect(queryAction(content.actions.temporaryPassword)).toBeNull();
  });

  it('inativa com confirmação e passa a oferecer a reativação', async () => {
    renderUser(apiUser(BRUNO));
    apiStub().use({
      'POST /users/:userId/deactivate': () => {
        current = apiUser({ ...BRUNO, status: 'inactive' });
        return { data: current, meta: {} };
      },
    });

    const dialog = await confirmDeactivation();

    expect(
      within(dialog).getByText(content.deactivate.text(BRUNO.name)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: content.actions.reactivate }),
    ).toBeInTheDocument();
    expect(
      value(section(content.dataTitle), content.fields.status),
    ).toHaveTextContent('Inativo');
    expect(apiStub().last('POST /users/:userId/deactivate').params.userId).toBe(
      BRUNO.id,
    );
  });

  it('reemite o convite no canal do servidor e mostra a nova senha uma única vez', async () => {
    renderUser(
      apiUser({
        ...ANA,
        invitation: passwordInvitation({ status: 'expired' }),
      }),
    );
    apiStub().use({
      'POST /users/:userId/invitation': () => {
        current = apiUser({ ...ANA, invitation: passwordInvitation() });
        return reply(201, {
          data: {
            channel: 'temporary_password',
            temporaryPassword: PASSWORD,
            expiresAt: '2026-11-11T15:00:00.000Z',
          },
          meta: {},
        });
      },
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.reissueInvitation,
      }),
    );

    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });
    expect(within(shown).getByLabelText(passwordField.label).value).toBe(
      PASSWORD,
    );
    expect(
      apiStub().last('POST /users/:userId/invitation').body,
    ).toBeUndefined();
    fireEvent.click(within(shown).getByRole('button', { name: result.close }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument();
    expect(
      value(section(content.dataTitle), content.fields.status),
    ).toHaveTextContent('Convidado');
  });

  it('gera senha provisória para o usuário ativo', async () => {
    renderUser(apiUser(BRUNO));
    apiStub().use({
      'POST /auth/users/:userId/temporary-password': () =>
        reply(201, {
          data: {
            temporaryPassword: PASSWORD,
            expiresAt: '2026-11-11T15:00:00.000Z',
          },
          meta: {},
        }),
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.temporaryPassword,
      }),
    );

    const shown = await screen.findByRole('dialog', {
      name: result.passwordTitle,
    });
    expect(within(shown).getByLabelText(passwordField.label).value).toBe(
      PASSWORD,
    );
  });

  it('com o convite por e-mail, mostra a mensagem da API e oferece a reemissão com senha provisória', async () => {
    const message =
      'Convite enviado ao e-mail do usuário. O link vale até 13/11/2026 às 12:00 (horário de Brasília).';
    renderUser(
      apiUser({
        ...ANA,
        invitation: emailInvitation({ status: 'invalidated' }),
      }),
    );
    apiStub().use({
      'POST /users/:userId/invitation': () => {
        current = apiUser({
          ...ANA,
          invitation: emailInvitation({
            expiresAt: '2026-11-13T15:00:00.000Z',
          }),
        });
        return reply(201, {
          data: {
            channel: 'email',
            expiresAt: '2026-11-13T15:00:00.000Z',
            delivery: { status: 'sent' },
          },
          meta: { message },
        });
      },
    });
    expect(
      await screen.findByRole('button', {
        name: content.actions.reissueWithPassword,
      }),
    ).toBeInTheDocument();
    fireEvent.click(action(content.actions.reissueInvitation));

    const shown = await screen.findByRole('dialog', {
      name: result.emailTitle,
    });
    expect(within(shown).getByText(message)).toBeInTheDocument();
    expect(within(shown).queryByLabelText(passwordField.label)).toBeNull();
    fireEvent.click(within(shown).getByRole('button', { name: result.close }));

    const invitation = await waitFor(() => section(content.invitationTitle));
    await waitFor(() =>
      expect(
        value(invitation, content.invitationFields.channel),
      ).toHaveTextContent(content.channelLabels.email),
    );
  });

  it('reemite com senha provisória pedindo o canal à API', async () => {
    renderUser(apiUser({ ...ANA, invitation: emailInvitation() }));
    apiStub().use({
      'POST /users/:userId/invitation': () =>
        reply(201, {
          data: {
            channel: 'temporary_password',
            temporaryPassword: PASSWORD,
            expiresAt: '2026-11-11T15:00:00.000Z',
          },
          meta: {},
        }),
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.actions.reissueWithPassword,
      }),
    );

    await screen.findByRole('dialog', { name: result.passwordTitle });
    expect(apiStub().last('POST /users/:userId/invitation').body).toEqual({
      channel: 'temporary_password',
    });
  });

  it('altera o perfil com o aviso dos vínculos de cuidado', async () => {
    renderUser(apiUser(ANA));
    apiStub().use({
      'PATCH /users/:userId/profile': ({ body }) => {
        current = apiUser({ ...ANA, profileCode: body.profileCode });
        return {
          data: { id: ANA.id, name: ANA.name, profile: current.profile },
          meta: {},
        };
      },
    });
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
    expect(apiStub().last('PATCH /users/:userId/profile').body).toEqual({
      profileCode: 'professional',
    });
  });

  it('edita no diálogo enviando só o que mudou', async () => {
    renderUser(apiUser(BRUNO));
    apiStub().use({
      'PATCH /users/:userId': ({ body }) => {
        current = { ...current, ...body };
        return { data: current, meta: {} };
      },
    });
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
    expect(apiStub().last('PATCH /users/:userId').body).toEqual({
      phone: '(16) 99999-0000',
    });
  });

  describe('situação mudada por outra pessoa', () => {
    it('fecha a confirmação, recarrega o usuário e mostra a mensagem da API', async () => {
      renderUser(apiUser(BRUNO));
      apiStub().use({
        'POST /users/:userId/deactivate': () => {
          current = apiUser({ ...BRUNO, status: 'inactive' });
          return apiFailure(409, 'USER_ALREADY_INACTIVE', INACTIVE_MESSAGE);
        },
      });
      await screen.findByRole('heading', { name: BRUNO.name });
      const before = loads();

      await confirmDeactivation();

      expect(await screen.findByText(INACTIVE_MESSAGE)).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: content.deactivate.title }),
      ).not.toBeInTheDocument();
      expect(loads()).toBe(before + 1);
      expect(action(content.actions.reactivate)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorWarning');
    });

    it('recarrega quando o convite já foi aceito antes da reemissão', async () => {
      const message =
        'O usuário já está ativo. Para uma nova senha, use a redefinição de senha.';
      renderUser(apiUser({ ...ANA, invitation: passwordInvitation() }));
      apiStub().use({
        'POST /users/:userId/invitation': () => {
          current = apiUser(ANA);
          return apiFailure(409, 'USER_INVITATION_ALREADY_ACCEPTED', message);
        },
      });
      fireEvent.click(
        await screen.findByRole('button', {
          name: content.actions.reissueInvitation,
        }),
      );

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(
        await screen.findByRole('button', {
          name: content.actions.temporaryPassword,
        }),
      ).toBeInTheDocument();
      expect(queryAction(content.actions.reissueInvitation)).toBeNull();
    });

    it('recarrega quando quem ia receber a senha provisória deixou de estar ativo', async () => {
      renderUser(apiUser(BRUNO));
      apiStub().use({
        'POST /auth/users/:userId/temporary-password': () => {
          current = apiUser({ ...BRUNO, status: 'inactive' });
          return apiFailure(
            404,
            'AUTH_USER_NOT_FOUND',
            'Usuário não encontrado.',
          );
        },
      });
      fireEvent.click(
        await screen.findByRole('button', {
          name: content.actions.temporaryPassword,
        }),
      );

      expect(
        await screen.findByText('Usuário não encontrado.'),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: content.actions.reactivate }),
      ).toBeInTheDocument();
    });

    it('outro erro continua na confirmação, sem recarregar', async () => {
      renderUser(apiUser(BRUNO));
      apiStub().use({
        'POST /users/:userId/deactivate': () => ({ data: current, meta: {} }),
      });
      apiStub().fail('POST /users/:userId/deactivate');
      await screen.findByRole('heading', { name: BRUNO.name });
      const before = loads();

      const dialog = await confirmDeactivation();

      expect(
        await within(dialog).findByText(
          'Não foi possível concluir a operação. Tente novamente.',
        ),
      ).toBeInTheDocument();
      expect(loads()).toBe(before);
    });
  });
});

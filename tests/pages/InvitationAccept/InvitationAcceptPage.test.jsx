import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import SessionProvider from '../../../src/components/SessionProvider.jsx';
import { PATHS } from '../../../src/constants/routes.js';
import {
  accessErrors,
  accessFields,
  fieldErrorMessages,
} from '../../../src/data/access.js';
import { invitationAcceptContent as content } from '../../../src/data/invitationAccept.js';
import { profileLabels } from '../../../src/data/profiles.js';
import InvitationAcceptPage from '../../../src/pages/InvitationAccept/InvitationAcceptPage.jsx';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';

const INSPECT = 'POST /auth/invitations/inspect';
const ACCEPT = 'POST /auth/invitations/accept';
const INVALID_MESSAGE =
  'Este convite não é mais válido. Peça um novo convite ao administrador da sua organização.';

const INVITATION = {
  user: { name: 'Ana Exemplo', email: 'ana@exemplo.test' },
  organization: { code: 'ipe-amarelo', name: 'Residencial Ipê Amarelo' },
  profile: { code: 'caregiver', name: 'Cuidador' },
  expiresAt: '2026-11-22T15:00:00.000Z',
};

// O login de verdade mostraria o aviso; aqui basta conferir o que chegou.
function LoginProbe() {
  return <p>Login</p>;
}

function renderInvitation(query = '?token=token-do-convite') {
  const router = createMemoryRouter(
    [
      { path: PATHS.INVITATION_ACCEPT, element: <InvitationAcceptPage /> },
      { path: PATHS.LOGIN, element: <LoginProbe /> },
    ],
    { initialEntries: [`${PATHS.INVITATION_ACCEPT}${query}`] },
  );
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ThemeProvider>,
  );
  return router;
}

function field(name) {
  return screen.getByLabelText(accessFields[name].label, {
    selector: 'input',
  });
}

function save(newPassword, confirmation = newPassword) {
  fireEvent.change(field('newPassword'), { target: { value: newPassword } });
  fireEvent.change(field('confirmation'), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: content.submit }));
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('InvitationAcceptPage', () => {
  it('mostra quem foi convidado, a organização, o perfil e a validade', async () => {
    apiStub().use({ [INSPECT]: () => ({ data: INVITATION, meta: {} }) });
    renderInvitation();

    expect(await screen.findByText('Ana Exemplo')).toBeInTheDocument();
    expect(screen.getByText('ana@exemplo.test')).toBeInTheDocument();
    expect(screen.getByText('Residencial Ipê Amarelo')).toBeInTheDocument();
    expect(screen.getByText(profileLabels.caregiver)).toBeInTheDocument();
    expect(screen.getByText('22/11/2026 às 12:00')).toBeInTheDocument();
    expect(apiStub().last(INSPECT).body).toEqual({ token: 'token-do-convite' });
  });

  it('aceita com a senha e abre o login preenchido, com a mensagem da API', async () => {
    apiStub().use({
      [INSPECT]: () => ({ data: INVITATION, meta: {} }),
      [ACCEPT]: () => ({
        data: { organizationCode: 'ipe-amarelo', email: 'ana@exemplo.test' },
        meta: {
          message: 'Senha cadastrada. Entre com seu e-mail e a nova senha.',
        },
      }),
    });
    const router = renderInvitation();
    await screen.findByText('Ana Exemplo');

    save('senha-da-ana');

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
    expect(router.state.location.state).toEqual({
      notice: {
        kind: 'invitationAccepted',
        organizationCode: 'ipe-amarelo',
        email: 'ana@exemplo.test',
        message: 'Senha cadastrada. Entre com seu e-mail e a nova senha.',
      },
    });
    expect(apiStub().last(ACCEPT).body).toEqual({
      token: 'token-do-convite',
      newPassword: 'senha-da-ana',
    });
  });

  it('confere o tamanho da senha e a confirmação antes do envio', async () => {
    apiStub().use({ [INSPECT]: () => ({ data: INVITATION, meta: {} }) });
    renderInvitation();
    await screen.findByText('Ana Exemplo');

    save('1234567', '1234568');

    expect(
      await screen.findByText(fieldErrorMessages.newPassword.tooShort),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fieldErrorMessages.confirmation.mismatch),
    ).toBeVisible();
    expect(apiStub().last(ACCEPT)).toBeUndefined();
  });

  it('mostra a mensagem da API para link inválido, vencido, usado ou revogado', async () => {
    apiStub().use({
      [INSPECT]: () =>
        apiFailure(422, 'AUTH_INVITATION_INVALID_OR_EXPIRED', INVALID_MESSAGE),
    });
    renderInvitation();

    expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByLabelText(accessFields.newPassword.label)).toBeNull();
    expect(
      screen.getByRole('link', { name: content.backToLogin }),
    ).toHaveAttribute('href', PATHS.LOGIN);
  });

  it('mostra a mensagem da API quando o link deixa de valer no envio', async () => {
    apiStub().use({
      [INSPECT]: () => ({ data: INVITATION, meta: {} }),
      [ACCEPT]: () =>
        apiFailure(422, 'AUTH_INVITATION_INVALID_OR_EXPIRED', INVALID_MESSAGE),
    });
    renderInvitation();
    await screen.findByText('Ana Exemplo');

    save('senha-da-ana');

    expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByLabelText(accessFields.newPassword.label)).toBeNull();
  });

  it('sem token no endereço, orienta a pedir um novo convite sem chamar a API', () => {
    renderInvitation('');

    expect(screen.getByText(content.missingToken)).toBeInTheDocument();
    expect(apiStub().requests).toEqual([]);
  });

  it('mostra erro com nova tentativa quando a consulta falha', async () => {
    apiStub().use({ [INSPECT]: () => ({ data: INVITATION, meta: {} }) });
    apiStub().fail(INSPECT);
    renderInvitation();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar de novo' }),
    );

    expect(await screen.findByText('Ana Exemplo')).toBeInTheDocument();
  });

  it('mostra erro e mantém o formulário quando o envio falha sem resposta da API', async () => {
    apiStub().use({ [INSPECT]: () => ({ data: INVITATION, meta: {} }) });
    apiStub().fail(ACCEPT);
    renderInvitation();
    await screen.findByText('Ana Exemplo');

    save('senha-da-ana');

    expect(await screen.findByText(accessErrors.unexpected)).toBeVisible();
    expect(field('newPassword')).toBeInTheDocument();
  });

  it('não guarda o token no navegador', async () => {
    apiStub().use({ [INSPECT]: () => ({ data: INVITATION, meta: {} }) });
    renderInvitation();
    await screen.findByText('Ana Exemplo');

    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(
      'token-do-convite',
    );
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(
      'token-do-convite',
    );
  });
});

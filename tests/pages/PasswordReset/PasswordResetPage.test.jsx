import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { accessFields, fieldErrorMessages } from '../../../src/data/access.js';
import { resetContent } from '../../../src/data/passwordRecovery.js';
import PasswordResetPage from '../../../src/pages/PasswordReset/PasswordResetPage.jsx';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub, reply } from '../../support/apiStub.js';

const RESET = 'POST /auth/password-recovery/reset';
const LINK_TOKEN = 'token-do-link';

function renderReset(token) {
  const query = token === undefined ? '' : `?token=${token}`;
  const router = createMemoryRouter(
    [
      { path: PATHS.PASSWORD_RESET, element: <PasswordResetPage /> },
      { path: PATHS.LOGIN, element: <p>Login</p> },
      { path: PATHS.PASSWORD_RECOVERY, element: <p>Recuperação</p> },
    ],
    { initialEntries: [`${PATHS.PASSWORD_RESET}${query}`] },
  );
  render(
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
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
  fireEvent.click(screen.getByRole('button', { name: resetContent.submit }));
}

describe('PasswordResetPage', () => {
  it('sem token no endereço, orienta a pedir um novo link', async () => {
    const router = renderReset();

    expect(screen.getByText(resetContent.invalidLink)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resetContent.submit }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('link', { name: resetContent.requestNewLink }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PASSWORD_RECOVERY),
    );
  });

  it('valida o tamanho da nova senha e a confirmação antes do envio', async () => {
    renderReset(LINK_TOKEN);

    save('1234567', '1234568');

    expect(
      await screen.findByText(fieldErrorMessages.newPassword.tooShort),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fieldErrorMessages.confirmation.mismatch),
    ).toBeVisible();
  });

  it('redefine a senha com o token do link e leva ao login', async () => {
    apiStub().use({ [RESET]: () => reply(201, { data: null, meta: {} }) });
    const router = renderReset(LINK_TOKEN);

    save('senha-recuperada');

    expect(await screen.findByText(resetContent.success)).toBeInTheDocument();
    expect(apiStub().last(RESET)).toMatchObject({
      token: null,
      body: { token: LINK_TOKEN, newPassword: 'senha-recuperada' },
    });
    fireEvent.click(
      screen.getByRole('link', { name: resetContent.backToLogin }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
  });

  it('com link desconhecido ou já usado, orienta a pedir outro', async () => {
    apiStub().use({
      [RESET]: () =>
        apiFailure(
          422,
          'AUTH_RESET_TOKEN_INVALID_OR_EXPIRED',
          'Token de redefinição inválido ou expirado.',
        ),
    });
    renderReset('link-qualquer');

    save('senha-recuperada');

    expect(
      await screen.findByText(resetContent.invalidLink),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: resetContent.requestNewLink }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resetContent.submit }),
    ).not.toBeInTheDocument();
  });
});

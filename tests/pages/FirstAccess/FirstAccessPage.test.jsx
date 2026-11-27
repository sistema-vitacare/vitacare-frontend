import { ThemeProvider } from '@mui/material';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../../../src/components/SessionProvider.jsx';
import { PATHS } from '../../../src/constants/routes.js';
import { accessFields, fieldErrorMessages } from '../../../src/data/access.js';
import { firstAccessContent } from '../../../src/data/firstAccess.js';
import { loginContent } from '../../../src/data/login.js';
import FirstAccessPage from '../../../src/pages/FirstAccess/FirstAccessPage.jsx';
import LoginPage from '../../../src/pages/Login/LoginPage.jsx';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  TEST_PASSWORD,
  invitedUser,
  loginData,
} from '../../support/fixtures/sessions.js';

const MINUTE = 60 * 1000;

function renderFlow(initialPath = PATHS.LOGIN) {
  const router = createMemoryRouter(
    [
      { path: PATHS.LOGIN, element: <LoginPage /> },
      { path: PATHS.FIRST_ACCESS, element: <FirstAccessPage /> },
      { path: PATHS.PATIENTS, element: <p>Pacientes</p> },
    ],
    { initialEntries: [initialPath] },
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

function fill(values) {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(field(name), { target: { value } });
  }
}

// Entra pelo login como a convidada e espera a tela de primeiro acesso.
async function enterAsInvited(password = TEST_PASSWORD) {
  fill({
    organizationCode: 'ipe-amarelo',
    email: invitedUser.email,
    password,
  });
  fireEvent.click(screen.getByRole('button', { name: loginContent.submit }));
  await screen.findByRole('heading', {
    level: 1,
    name: firstAccessContent.title,
  });
}

function save(newPassword, confirmation = newPassword) {
  fill({ newPassword, confirmation });
  fireEvent.click(
    screen.getByRole('button', { name: firstAccessContent.submit }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FirstAccessPage', () => {
  it('leva ao login quem não está com a sessão restrita', async () => {
    const router = renderFlow(PATHS.FIRST_ACCESS);

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
  });

  it('mostra a conta e só oferece a troca de senha e o Sair', async () => {
    renderFlow();

    await enterAsInvited();

    expect(screen.getByText('Edna Carvalho Pires')).toBeInTheDocument();
    // Nenhum link leva para dentro do aplicativo; o do termo de uso, no
    // rodapé, abre a página pública da API.
    expect(
      screen
        .queryAllByRole('link')
        .filter((link) => link.getAttribute('href').startsWith('/')),
    ).toEqual([]);
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter(Boolean),
    ).toEqual([firstAccessContent.submit, firstAccessContent.signOut]);
  });

  it('valida o tamanho da nova senha e a confirmação', async () => {
    renderFlow();
    await enterAsInvited();

    save('1234567', 'outra-coisa');

    expect(
      await screen.findByText(fieldErrorMessages.newPassword.tooShort),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fieldErrorMessages.confirmation.mismatch),
    ).toBeVisible();
  });

  it('recusa a nova senha igual à provisória, com o erro no campo', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () =>
        apiFailure(
          422,
          'AUTH_PASSWORD_REUSE',
          'A nova senha não pode ser igual à atual.',
        ),
    });
    renderFlow();
    await enterAsInvited();

    save(TEST_PASSWORD);

    expect(
      await screen.findByText(fieldErrorMessages.newPassword.reuse),
    ).toBeInTheDocument();
    expect(field('newPassword')).toHaveAttribute('aria-invalid', 'true');
  });

  it('depois da troca, volta ao login preenchido e entra com a senha nova', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () => ({ data: null, meta: {} }),
    });
    const router = renderFlow();
    await enterAsInvited();

    save('senha-definitiva');

    expect(
      await screen.findByText(loginContent.passwordChanged),
    ).toBeInTheDocument();
    expect(apiStub().last('POST /auth/password/first-access')).toMatchObject({
      token: `token-${invitedUser.id}`,
      body: { newPassword: 'senha-definitiva' },
    });
    expect(field('email')).toHaveValue(invitedUser.email);

    // Depois do primeiro acesso, a API ativa a conta e a senha nova vale.
    apiStub().use({
      'POST /auth/login': ({ body }) =>
        body.password === 'senha-definitiva'
          ? { data: loginData({ ...invitedUser, status: 'active' }), meta: {} }
          : apiFailure(
              401,
              'AUTH_INVALID_CREDENTIALS',
              'Credenciais inválidas.',
            ),
    });
    fill({ password: 'senha-definitiva' });
    fireEvent.click(screen.getByRole('button', { name: loginContent.submit }));

    expect(await screen.findByText('Pacientes')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.PATIENTS);
  });

  it('volta ao login pelo Sair, sem aviso', async () => {
    const router = renderFlow();
    await enterAsInvited();

    fireEvent.click(
      screen.getByRole('button', { name: firstAccessContent.signOut }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
    expect(screen.queryByText(loginContent.expired)).not.toBeInTheDocument();
    expect(
      screen.queryByText(loginContent.passwordChanged),
    ).not.toBeInTheDocument();
  });

  it('volta ao login com o aviso de sessão expirada depois de 10 minutos', async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
      shouldAdvanceTime: true,
    });
    renderFlow();
    await enterAsInvited();

    act(() => vi.advanceTimersByTime(10 * MINUTE));

    expect(await screen.findByText(loginContent.expired)).toBeInTheDocument();
  });
});

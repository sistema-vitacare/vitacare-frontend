import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import {
  accessErrors,
  accessFields,
  fieldErrorMessages,
} from '../../../src/data/access.js';
import { RECOVERY_GUIDANCE } from '../../../src/data/mocks/credentials.js';
import { recoveryContent } from '../../../src/data/passwordRecovery.js';
import PasswordRecoveryPage from '../../../src/pages/PasswordRecovery/PasswordRecoveryPage.jsx';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { theme } from '../../../src/styles/theme.js';

function renderRecovery() {
  const router = createMemoryRouter(
    [
      { path: PATHS.PASSWORD_RECOVERY, element: <PasswordRecoveryPage /> },
      { path: PATHS.LOGIN, element: <p>Login</p> },
    ],
    { initialEntries: [PATHS.PASSWORD_RECOVERY] },
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

function request(email) {
  fireEvent.change(field('organizationCode'), {
    target: { value: 'ipe-amarelo' },
  });
  fireEvent.change(field('email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: recoveryContent.submit }));
}

afterEach(() => {
  resetMockState();
});

describe('PasswordRecoveryPage', () => {
  it('pede código da organização e e-mail e permite voltar ao login', async () => {
    const router = renderRecovery();

    expect(
      screen.getByRole('heading', { level: 1, name: recoveryContent.title }),
    ).toBeInTheDocument();
    expect(field('organizationCode')).toBeInTheDocument();
    expect(field('email')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('link', { name: recoveryContent.backToLogin }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
  });

  it('valida os campos antes do envio', async () => {
    renderRecovery();

    fireEvent.click(
      screen.getByRole('button', { name: recoveryContent.submit }),
    );

    expect(
      await screen.findByText(fieldErrorMessages.organizationCode.required),
    ).toBeInTheDocument();
    expect(screen.getByText(fieldErrorMessages.email.required)).toBeVisible();
  });

  it('mostra a orientação da API depois do pedido', async () => {
    renderRecovery();

    request('helena.vasconcelos@ipeamarelo.example');

    expect(await screen.findByText(RECOVERY_GUIDANCE)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: recoveryContent.submit }),
    ).not.toBeInTheDocument();
  });

  it('dá a mesma orientação para e-mail sem conta', async () => {
    renderRecovery();

    request('ninguem@ipeamarelo.example');

    expect(await screen.findByText(RECOVERY_GUIDANCE)).toBeInTheDocument();
  });

  it('avisa do limite de pedidos da mesma conta', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      renderRecovery();
      request('helena.vasconcelos@ipeamarelo.example');
      await screen.findByText(RECOVERY_GUIDANCE);
      document.body.innerHTML = '';
    }
    renderRecovery();

    request('helena.vasconcelos@ipeamarelo.example');

    expect(
      await screen.findByText(recoveryContent.blocked),
    ).toBeInTheDocument();
  });

  it('mostra erro e mantém o formulário quando a requisição falha', async () => {
    renderRecovery();
    failNextRequest();

    request('helena.vasconcelos@ipeamarelo.example');

    expect(
      await screen.findByText(accessErrors.unexpected),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: recoveryContent.submit }),
    ).toBeInTheDocument();
  });
});

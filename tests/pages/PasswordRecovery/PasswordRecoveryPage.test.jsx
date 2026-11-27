import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import {
  accessErrors,
  accessFields,
  fieldErrorMessages,
} from '../../../src/data/access.js';
import { recoveryContent } from '../../../src/data/passwordRecovery.js';
import PasswordRecoveryPage from '../../../src/pages/PasswordRecovery/PasswordRecoveryPage.jsx';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub, reply } from '../../support/apiStub.js';

const REQUEST = 'POST /auth/password-recovery/request';
// A API escolhe o texto pelo SMTP do servidor; a tela só o mostra.
const GUIDANCE =
  'Se a conta estiver ativa, enviaremos ao e-mail informado um link válido por 15 minutos.';

function answerWithGuidance() {
  apiStub().use({
    [REQUEST]: () => reply(202, { data: null, meta: { message: GUIDANCE } }),
  });
}

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
    answerWithGuidance();
    renderRecovery();

    request('helena.vasconcelos@ipeamarelo.example');

    expect(await screen.findByText(GUIDANCE)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: recoveryContent.submit }),
    ).not.toBeInTheDocument();
    expect(apiStub().last(REQUEST).body).toEqual({
      organizationCode: 'ipe-amarelo',
      email: 'helena.vasconcelos@ipeamarelo.example',
    });
  });

  it('avisa do limite de pedidos que a API aplica', async () => {
    apiStub().use({
      [REQUEST]: () =>
        apiFailure(
          429,
          'AUTH_TEMPORARILY_BLOCKED',
          'Muitas tentativas. Aguarde antes de tentar novamente.',
        ),
    });
    renderRecovery();

    request('helena.vasconcelos@ipeamarelo.example');

    expect(
      await screen.findByText(recoveryContent.blocked),
    ).toBeInTheDocument();
  });

  it('mostra erro e mantém o formulário quando a requisição falha', async () => {
    renderRecovery();
    apiStub().fail(REQUEST);

    request('helena.vasconcelos@ipeamarelo.example');

    expect(
      await screen.findByText(accessErrors.unexpected),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: recoveryContent.submit }),
    ).toBeInTheDocument();
  });
});

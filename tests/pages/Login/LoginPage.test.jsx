import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Navigate, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import SessionProvider from '../../../src/components/SessionProvider.jsx';
import { PATHS } from '../../../src/constants/routes.js';
import {
  accessErrors,
  accessFields,
  fieldErrorMessages,
} from '../../../src/data/access.js';
import { loginContent } from '../../../src/data/login.js';
import { profileLabels } from '../../../src/data/profiles.js';
import { useSession } from '../../../src/hooks/useSession.js';
import LoginPage from '../../../src/pages/Login/LoginPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  credentialsFor,
  invitedUser,
  sessionHandlers,
} from '../../support/fixtures/sessions.js';

// Primeiro acesso simplificado: conclui a troca com um clique, para que o
// teste chegue ao login com o aviso de senha definida.
function FirstAccessStub() {
  const { status, completeFirstAccess } = useSession();
  if (status !== 'restricted') {
    return <Navigate to={PATHS.LOGIN} replace />;
  }
  return (
    <button type="button" onClick={() => completeFirstAccess('senha-nova-1')}>
      Concluir primeiro acesso
    </button>
  );
}

function renderLogin(entry = PATHS.LOGIN) {
  const router = createMemoryRouter(
    [
      { path: PATHS.LOGIN, element: <LoginPage /> },
      { path: PATHS.DASHBOARD, element: <p>Painel</p> },
      { path: PATHS.FIRST_ACCESS, element: <FirstAccessStub /> },
      { path: PATHS.TERMS, element: <p>Termo de uso</p> },
      { path: PATHS.PASSWORD_RECOVERY, element: <p>Recuperação</p> },
    ],
    { initialEntries: [entry] },
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

function submit() {
  fireEvent.click(screen.getByRole('button', { name: loginContent.submit }));
}

const helena = credentialsFor('admin');

afterEach(() => {
  resetMockState();
});

describe('LoginPage', () => {
  it('pede código da organização, e-mail e senha e oferece a recuperação', async () => {
    const router = renderLogin();

    expect(field('organizationCode')).toBeInTheDocument();
    expect(field('email')).toBeInTheDocument();
    expect(field('password')).toHaveAttribute('type', 'password');

    fireEvent.click(
      screen.getByRole('link', { name: loginContent.forgotPassword }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PASSWORD_RECOVERY),
    );
  });

  it('valida os campos antes do envio, com a mensagem abaixo de cada um', async () => {
    const router = renderLogin();

    submit();

    expect(
      await screen.findByText(fieldErrorMessages.organizationCode.required),
    ).toBeInTheDocument();
    expect(screen.getByText(fieldErrorMessages.email.required)).toBeVisible();
    expect(
      screen.getByText(fieldErrorMessages.password.required),
    ).toBeVisible();
    expect(field('email')).toHaveAttribute('aria-invalid', 'true');
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it('aponta código e e-mail fora do formato', async () => {
    renderLogin();
    fill({ organizationCode: 'ipe amarelo', email: 'helena', password: '12' });

    submit();

    expect(
      await screen.findByText(fieldErrorMessages.organizationCode.invalid),
    ).toBeInTheDocument();
    expect(screen.getByText(fieldErrorMessages.email.invalid)).toBeVisible();
    expect(
      screen.getByText(fieldErrorMessages.password.tooShort),
    ).toBeVisible();
  });

  it('tira a mensagem do campo quando ele é corrigido', async () => {
    renderLogin();
    submit();
    await screen.findByText(fieldErrorMessages.email.required);

    fill({ email: 'helena.vasconcelos@ipeamarelo.example' });

    expect(
      screen.queryByText(fieldErrorMessages.email.required),
    ).not.toBeInTheDocument();
  });

  it('responde credenciais erradas com mensagem única, sem apontar campo, e limpa a senha', async () => {
    renderLogin();
    fill({ ...helena, password: 'senha-errada' });

    submit();

    expect(
      await screen.findByText(loginContent.invalidCredentials),
    ).toBeInTheDocument();
    expect(field('organizationCode')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(field('email')).not.toHaveAttribute('aria-invalid', 'true');
    expect(field('password')).toHaveValue('');
  });

  it('avisa do bloqueio temporário que a API aplica depois de cinco falhas', async () => {
    apiStub().use({
      'POST /auth/login': () =>
        apiFailure(
          429,
          'AUTH_TEMPORARILY_BLOCKED',
          'Muitas tentativas. Aguarde antes de tentar novamente.',
        ),
    });
    renderLogin();
    fill(helena);

    submit();

    expect(await screen.findByText(loginContent.blocked)).toBeInTheDocument();
  });

  it('leva à página inicial do perfil depois do login', async () => {
    const router = renderLogin();
    fill(helena);

    submit();

    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.DASHBOARD);
  });

  it('leva a convidada ao primeiro acesso', async () => {
    const router = renderLogin();
    fill({ ...helena, email: invitedUser.email });

    submit();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.FIRST_ACCESS),
    );
  });

  it('leva ao termo de uso quem ainda não aceitou a versão vigente', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));
    const router = renderLogin();
    fill(helena);

    submit();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.TERMS),
    );
  });

  it('volta do primeiro acesso com o aviso e com código e e-mail preenchidos', async () => {
    apiStub().use({
      'POST /auth/password/first-access': () => ({ data: null, meta: {} }),
    });
    renderLogin();
    fill({ ...helena, email: invitedUser.email });
    submit();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Concluir primeiro acesso' }),
    );

    expect(
      await screen.findByText(loginContent.passwordChanged),
    ).toBeInTheDocument();
    expect(field('organizationCode')).toHaveValue('ipe-amarelo');
    expect(field('email')).toHaveValue(invitedUser.email);
    expect(field('password')).toHaveValue('');
  });

  it('abre depois do aceite do convite com a mensagem da API e os campos preenchidos', async () => {
    renderLogin({
      pathname: PATHS.LOGIN,
      state: {
        notice: {
          kind: 'invitationAccepted',
          organizationCode: 'ipe-amarelo',
          email: 'nova.pessoa@ipeamarelo.example',
          message: 'Senha cadastrada. Entre com seu e-mail e a nova senha.',
        },
      },
    });

    expect(
      await screen.findByText(
        'Senha cadastrada. Entre com seu e-mail e a nova senha.',
      ),
    ).toBeInTheDocument();
    expect(field('organizationCode')).toHaveValue('ipe-amarelo');
    expect(field('email')).toHaveValue('nova.pessoa@ipeamarelo.example');
  });

  it('mostra erro com nova tentativa quando a requisição falha', async () => {
    renderLogin();
    fill(helena);
    apiStub().fail('POST /auth/login');

    submit();

    expect(
      await screen.findByText(accessErrors.unexpected),
    ).toBeInTheDocument();
    expect(screen.queryByText(loginContent.invalidCredentials)).toBeNull();
    expect(field('password')).toHaveValue(helena.password);
  });

  it('não oferece mais os atalhos de demonstração: a entrada é pela API', () => {
    renderLogin();

    for (const label of Object.values(profileLabels)) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });
});

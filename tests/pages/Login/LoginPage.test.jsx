import { ThemeProvider } from '@mui/material';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
import { DEMO_PASSWORD } from '../../../src/data/mocks/credentials.js';
import { profileLabels } from '../../../src/data/profiles.js';
import { useSession } from '../../../src/hooks/useSession.js';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import LoginPage from '../../../src/pages/Login/LoginPage.jsx';
import { theme } from '../../../src/styles/theme.js';

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

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: PATHS.LOGIN, element: <LoginPage /> },
      { path: PATHS.DASHBOARD, element: <p>Painel</p> },
      { path: PATHS.FIRST_ACCESS, element: <FirstAccessStub /> },
      { path: PATHS.PASSWORD_RECOVERY, element: <p>Recuperação</p> },
    ],
    { initialEntries: [PATHS.LOGIN] },
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

const helena = {
  organizationCode: 'ipe-amarelo',
  email: 'helena.vasconcelos@ipeamarelo.example',
  password: DEMO_PASSWORD,
};

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

  it('avisa do bloqueio na sexta tentativa, depois de cinco falhas', async () => {
    renderLogin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      fill({ ...helena, password: 'senha-errada' });
      submit();
      await screen.findByText(loginContent.invalidCredentials);
    }

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
    fill({ ...helena, email: 'edna.pires@ipeamarelo.example' });

    submit();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.FIRST_ACCESS),
    );
  });

  it('volta do primeiro acesso com o aviso e com código e e-mail preenchidos', async () => {
    renderLogin();
    fill({ ...helena, email: 'edna.pires@ipeamarelo.example' });
    submit();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Concluir primeiro acesso' }),
    );

    expect(
      await screen.findByText(loginContent.passwordChanged),
    ).toBeInTheDocument();
    expect(field('organizationCode')).toHaveValue('ipe-amarelo');
    expect(field('email')).toHaveValue('edna.pires@ipeamarelo.example');
    expect(field('password')).toHaveValue('');
  });

  it('mostra erro com nova tentativa quando a requisição falha', async () => {
    renderLogin();
    fill(helena);
    failNextRequest();

    submit();

    expect(
      await screen.findByText(accessErrors.unexpected),
    ).toBeInTheDocument();
    expect(screen.queryByText(loginContent.invalidCredentials)).toBeNull();
    expect(field('password')).toHaveValue(DEMO_PASSWORD);
  });

  it('mantém os atalhos de demonstração, que levam à página inicial', async () => {
    const router = renderLogin();
    const demo = screen.getByRole('region', { name: loginContent.demoTitle });

    fireEvent.click(
      within(demo).getByRole('button', { name: profileLabels.admin }),
    );

    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.DASHBOARD);
  });
});

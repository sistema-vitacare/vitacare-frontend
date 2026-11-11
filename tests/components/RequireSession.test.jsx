import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import RequireSession from '../../src/components/RequireSession.jsx';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { PATHS } from '../../src/constants/routes.js';
import { DEMO_PASSWORD } from '../../src/data/mocks/credentials.js';
import { useSession } from '../../src/hooks/useSession.js';
import { resetMockState } from '../../src/services/mockApi.js';

// Entra sem passar pela tela de login, que tem testes próprios.
function SignInButton({ email }) {
  const { signInWithPassword } = useSession();
  return (
    <button
      type="button"
      onClick={() =>
        signInWithPassword({
          organizationCode: 'ipe-amarelo',
          email,
          password: DEMO_PASSWORD,
        })
      }
    >
      {email}
    </button>
  );
}

function LoginStub() {
  const { status } = useSession();
  return (
    <>
      <p>Login: {status}</p>
      <SignInButton email="helena.vasconcelos@ipeamarelo.example" />
      <SignInButton email="edna.pires@ipeamarelo.example" />
    </>
  );
}

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        element: <RequireSession />,
        children: [{ path: '/pacientes', element: <p>Tela protegida</p> }],
      },
      { path: PATHS.LOGIN, element: <LoginStub /> },
      { path: PATHS.FIRST_ACCESS, element: <p>Primeiro acesso</p> },
    ],
    { initialEntries: ['/pacientes'] },
  );
  render(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
  return router;
}

async function signInAndOpenProtected(router, email, status) {
  fireEvent.click(await screen.findByRole('button', { name: email }));
  await screen.findByText(`Login: ${status}`);
  await router.navigate('/pacientes');
}

afterEach(() => {
  resetMockState();
});

describe('RequireSession', () => {
  it('leva ao login quem não tem sessão', async () => {
    const router = renderGuard();

    expect(await screen.findByText('Login: anonymous')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it('mostra a tela a quem tem sessão normal', async () => {
    const router = renderGuard();

    await signInAndOpenProtected(
      router,
      'helena.vasconcelos@ipeamarelo.example',
      'authenticated',
    );

    expect(await screen.findByText('Tela protegida')).toBeInTheDocument();
  });

  it('leva ao primeiro acesso quem está com a sessão restrita', async () => {
    const router = renderGuard();

    await signInAndOpenProtected(
      router,
      'edna.pires@ipeamarelo.example',
      'restricted',
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.FIRST_ACCESS),
    );
    expect(screen.queryByText('Tela protegida')).not.toBeInTheDocument();
  });
});

import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../src/components/SessionProvider.jsx';
import { PATHS } from '../src/constants/routes.js';
import { loginContent } from '../src/data/login.js';
import { navLabels } from '../src/data/navigation.js';
import { profileLabels } from '../src/data/profiles.js';
import { statusContent } from '../src/data/status.js';
import { appRoutes } from '../src/routes.jsx';
import { theme } from '../src/styles/theme.js';
import { resetViewport, setViewportWidth } from './support/viewport.js';

const HOUR = 60 * 60 * 1000;

function renderApp(path, routes = appRoutes) {
  setViewportWidth(1440);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ThemeProvider>,
  );
  return router;
}

function heading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

// Entra pelo atalho de demonstração da tela de login.
async function signInAs(profile) {
  fireEvent.click(
    await screen.findByRole('button', { name: profileLabels[profile] }),
  );
}

afterEach(() => {
  resetViewport();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('rotas', () => {
  it('leva ao login quem abre uma rota autenticada sem sessão', async () => {
    const router = renderApp(PATHS.PATIENTS);

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it.each([
    ['admin', PATHS.DASHBOARD, navLabels.dashboard],
    ['professional', PATHS.PATIENTS, navLabels.patients],
    ['caregiver', PATHS.PATIENTS, navLabels.patients],
    ['family', PATHS.PATIENTS, navLabels.patients],
    ['platform_admin', PATHS.ORGANIZATIONS, navLabels.organizations],
  ])(
    'leva o perfil %s, depois do atalho, para a página inicial %s',
    async (profile, path, title) => {
      const router = renderApp(PATHS.LOGIN);

      await signInAs(profile);

      expect(await heading(title)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
    },
  );

  it('leva o endereço raiz para a página inicial do perfil', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate(PATHS.HOME));

    expect(router.state.location.pathname).toBe(PATHS.DASHBOARD);
  });

  it('leva quem já tem sessão do login para a página inicial', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.LOGIN));

    expect(router.state.location.pathname).toBe(PATHS.PATIENTS);
  });

  it('volta ao login com o aviso quando a sessão expira em 12 horas', async () => {
    // `shouldAdvanceTime` deixa o relógio simulado andar junto com o real,
    // para que as buscas assíncronas da Testing Library continuem funcionando.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
      shouldAdvanceTime: true,
    });
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    act(() => vi.advanceTimersByTime(12 * HOUR));

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(screen.getByText(loginContent.expired)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it('não mostra o aviso de sessão expirada a quem ainda não entrou', async () => {
    renderApp(PATHS.LOGIN);

    await heading(loginContent.title);

    expect(screen.queryByText(loginContent.expired)).not.toBeInTheDocument();
  });

  it('mostra acesso negado na rota sem permissão', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('family');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.USERS));

    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('não monta a tela da rota sem permissão', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('family');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.USERS));

    expect(
      screen.queryByRole('heading', { level: 1, name: navLabels.users }),
    ).not.toBeInTheDocument();
  });

  it('mostra página não encontrada para endereço inexistente', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate('/endereco-que-nao-existe'));

    expect(await heading(statusContent.notFound.title)).toBeInTheDocument();
  });

  it('mostra a página de erro quando uma tela falha ao renderizar', async () => {
    // O React registra no console o erro capturado; aqui ele é esperado.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenScreen() {
      throw new Error('falha simulada');
    }
    const [root] = appRoutes;
    const routes = [
      {
        ...root,
        children: [
          { path: '/tela-quebrada', element: <BrokenScreen /> },
          ...root.children,
        ],
      },
    ];

    renderApp('/tela-quebrada', routes);

    expect(await heading(statusContent.error.title)).toBeInTheDocument();
  });

  it('volta ao login pelo Sair', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    fireEvent.click(screen.getByRole('button', { name: /Helena Vasconcelos/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sair' }));

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(screen.queryByText(loginContent.expired)).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });
});

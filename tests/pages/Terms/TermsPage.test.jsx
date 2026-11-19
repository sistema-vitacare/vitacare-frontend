import { ThemeProvider } from '@mui/material';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import SessionProvider from '../../../src/components/SessionProvider.jsx';
import { PATHS } from '../../../src/constants/routes.js';
import { accessErrors } from '../../../src/data/access.js';
import { termsContent } from '../../../src/data/terms.js';
import { useSession } from '../../../src/hooks/useSession.js';
import TermsPage from '../../../src/pages/Terms/TermsPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { theme } from '../../../src/styles/theme.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  credentialsFor,
  sessionHandlers,
} from '../../support/fixtures/sessions.js';

const CURRENT = 'GET /terms/current';
const ACCEPT = 'POST /terms/acceptances';

function terms(version) {
  return {
    version,
    title: 'Termo de Uso e Privacidade do VitaCare',
    content: `# Termo de Uso e Privacidade do VitaCare\n\nVersão ${version}\n\n## 1. O que é o VitaCare\n\nO VitaCare **não faz diagnóstico**.\n\n- manter a senha em segredo;\n- sair do sistema ao usar outro computador.`,
    contentHash: 'a'.repeat(64),
    publishedAt: '2026-11-13T12:00:00.000Z',
    pageUrl: `/termos?versao=${version}`,
  };
}

// Entra com o termo pendente e mostra a tela do termo, como faz o login.
function SignIn() {
  const { status, signInWithPassword } = useSession();
  return (
    <>
      <p>Sessão: {status}</p>
      <button
        type="button"
        onClick={() => signInWithPassword(credentialsFor('admin'))}
      >
        Entrar
      </button>
    </>
  );
}

async function renderTerms({ pending = true } = {}) {
  apiStub().use(sessionHandlers({ termsPending: pending ? ['admin'] : [] }));
  apiStub().use({ [CURRENT]: () => ({ data: terms(2), meta: {} }) });
  const router = createMemoryRouter(
    [
      { path: PATHS.LOGIN, element: <SignIn /> },
      { path: PATHS.TERMS, element: <TermsPage /> },
      { path: PATHS.DASHBOARD, element: <p>Painel</p> },
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
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText(pending ? 'Sessão: terms' : 'Sessão: authenticated');
  await router.navigate(PATHS.TERMS);
  return router;
}

afterEach(() => {
  resetMockState();
});

describe('TermsPage', () => {
  it('mostra o texto vigente, com a versão, as seções, o negrito e as listas', async () => {
    await renderTerms();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Termo de Uso e Privacidade do VitaCare',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(termsContent.version(2, '13/11/2026')),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 3, name: '1. O que é o VitaCare' }),
    ).toBeInTheDocument();
    expect(screen.getByText('não faz diagnóstico').tagName).toBe('STRONG');
    expect(
      within(screen.getByRole('main')).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: termsContent.openPage }),
    ).toHaveAttribute('href', 'http://api.test/termos?versao=2');
  });

  it('aceita a versão exibida e libera a mesma sessão, levando à página inicial', async () => {
    const router = await renderTerms();
    apiStub().use({
      [ACCEPT]: ({ body }) => ({ data: { version: body.version }, meta: {} }),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: termsContent.accept }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.DASHBOARD),
    );
    expect(apiStub().last(ACCEPT).body).toEqual({ version: 2 });
    expect(apiStub().last('GET /profile')).toBeDefined();
  });

  it('mostra o texto novo quando saiu outra versão durante a leitura', async () => {
    await renderTerms();
    await screen.findByText(termsContent.version(2, '13/11/2026'));
    apiStub().use({
      [ACCEPT]: () =>
        apiFailure(
          422,
          'TERMS_VERSION_NOT_CURRENT',
          'Esta versão do termo não é a vigente. Leia a versão atual e aceite de novo.',
        ),
      [CURRENT]: () => ({ data: terms(3), meta: {} }),
    });

    fireEvent.click(screen.getByRole('button', { name: termsContent.accept }));

    expect(
      await screen.findByText(
        'Esta versão do termo não é a vigente. Leia a versão atual e aceite de novo.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(termsContent.version(3, '13/11/2026')),
    ).toBeInTheDocument();
  });

  it('mostra erro e mantém o termo quando o aceite falha', async () => {
    await renderTerms();
    await screen.findByText(termsContent.version(2, '13/11/2026'));
    apiStub().fail(ACCEPT);

    fireEvent.click(screen.getByRole('button', { name: termsContent.accept }));

    expect(await screen.findByText(accessErrors.unexpected)).toBeVisible();
    expect(
      screen.getByRole('button', { name: termsContent.accept }),
    ).toBeEnabled();
  });

  it('sai pela API e volta ao login', async () => {
    const router = await renderTerms();

    fireEvent.click(
      await screen.findByRole('button', { name: termsContent.signOut }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
    expect(apiStub().last('POST /auth/logout')).toBeDefined();
  });

  it('leva à página inicial quem já aceitou o termo vigente', async () => {
    const router = await renderTerms({ pending: false });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.DASHBOARD),
    );
  });
});

import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import SessionProvider from '../src/components/SessionProvider.jsx';
import { PATHS } from '../src/constants/routes.js';
import { accessFields } from '../src/data/access.js';
import { appInfo } from '../src/data/app.js';
import { invitationAcceptContent } from '../src/data/invitationAccept.js';
import { loginContent } from '../src/data/login.js';
import { termsContent } from '../src/data/terms.js';
import { theme } from '../src/styles/theme.js';
import { apiStub } from './support/apiStub.js';
import {
  credentialsFor,
  sessionHandlers,
} from './support/fixtures/sessions.js';
import { preloadPages } from './support/preloadPages.js';

await preloadPages();

function renderApp() {
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ThemeProvider>,
  );
}

function heading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

// O roteador do aplicativo lê o endereço do navegador, que fica entre os
// testes do arquivo.
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('abre no login quando não há sessão', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: loginContent.title,
      }),
    ).toBeInTheDocument();
  });

  it('exibe a descrição do produto no login', async () => {
    renderApp();

    expect(await screen.findByText(appInfo.description)).toBeInTheDocument();
  });

  it('abre o aceite do convite pelo link do e-mail, sem sessão', async () => {
    apiStub().use({
      'POST /auth/invitations/inspect': () => ({
        data: {
          user: { name: 'Ana Exemplo', email: 'ana@exemplo.test' },
          organization: {
            code: 'ipe-amarelo',
            name: 'Residencial Ipê Amarelo',
          },
          profile: { code: 'caregiver', name: 'Cuidador' },
          expiresAt: '2026-11-22T15:00:00.000Z',
        },
        meta: {},
      }),
    });
    window.history.replaceState(
      null,
      '',
      `${PATHS.INVITATION_ACCEPT}?token=token-do-convite`,
    );
    renderApp();

    expect(await heading(invitationAcceptContent.title)).toBeInTheDocument();
    expect(await screen.findByText('Ana Exemplo')).toBeInTheDocument();
  });

  it('leva ao termo de uso quem entra sem ter aceitado a versão vigente', async () => {
    apiStub().use(sessionHandlers({ termsPending: ['admin'] }));
    apiStub().use({
      'GET /terms/current': () => ({
        data: {
          version: 2,
          title: 'Termo de Uso e Privacidade do VitaCare',
          content: '# Termo de Uso e Privacidade do VitaCare\n\nVersão 2',
          contentHash: 'a'.repeat(64),
          publishedAt: '2026-11-13T12:00:00.000Z',
          pageUrl: '/termos?versao=2',
        },
        meta: {},
      }),
    });
    renderApp();
    await heading(loginContent.title);

    for (const [name, value] of Object.entries(credentialsFor('admin'))) {
      fireEvent.change(
        screen.getByLabelText(accessFields[name].label, { selector: 'input' }),
        { target: { value } },
      );
    }
    fireEvent.click(screen.getByRole('button', { name: loginContent.submit }));

    expect(await heading(termsContent.title)).toBeInTheDocument();
    expect(window.location.pathname).toBe(PATHS.TERMS);
  });
});

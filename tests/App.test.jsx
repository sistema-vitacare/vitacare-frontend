import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import SessionProvider from '../src/components/SessionProvider.jsx';
import { appInfo } from '../src/data/app.js';
import { loginContent } from '../src/data/login.js';
import { theme } from '../src/styles/theme.js';

function renderApp() {
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ThemeProvider>,
  );
}

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
});

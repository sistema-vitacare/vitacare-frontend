import { ThemeProvider } from '@mui/material';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { theme } from '../../src/styles/theme.js';
import SignedIn from './SignedIn.jsx';
import { setViewportWidth } from './viewport.js';

/**
 * Renderiza telas autenticadas com tema, sessão do `profile` e roteador em
 * memória aberto em `path`. Devolve o roteador, para conferir o endereço.
 */
export function renderPage(routes, { profile, path, width = 1440 }) {
  setViewportWidth(width);
  const router = createMemoryRouter(
    [{ element: <SignedIn profile={profile} />, children: routes }],
    { initialEntries: [path] },
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

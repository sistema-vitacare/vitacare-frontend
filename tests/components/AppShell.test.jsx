import { ThemeProvider } from '@mui/material';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import AppShell from '../../src/components/AppShell.jsx';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { navGroupLabels, navLabels } from '../../src/data/navigation.js';
import { useSession } from '../../src/hooks/useSession.js';
import { theme } from '../../src/styles/theme.js';
import { resetViewport, setViewportWidth } from '../support/viewport.js';

// Entra com o perfil pedido e só então mostra o layout, como faz a
// proteção por sessão nas rotas.
function SignedIn({ profile }) {
  const { status, signIn } = useSession();
  useEffect(() => {
    signIn(profile);
  }, [profile, signIn]);
  return status === 'authenticated' ? <AppShell /> : null;
}

async function renderShell(
  profile,
  { width = 1440, path = '/pacientes' } = {},
) {
  setViewportWidth(width);
  const router = createMemoryRouter(
    [
      {
        element: <SignedIn profile={profile} />,
        children: [{ path: '*', element: <p>Conteúdo da tela</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ThemeProvider>,
  );
  await screen.findByText('Conteúdo da tela');
}

function mainNav() {
  return screen.getByRole('navigation', { name: 'Menu principal' });
}

function linkNames(container) {
  return within(container)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

afterEach(() => {
  resetViewport();
});

describe('AppShell no computador', () => {
  it('mostra a tela da rota na área principal', async () => {
    await renderShell('admin');

    expect(screen.getByRole('main')).toHaveTextContent('Conteúdo da tela');
  });

  it('mostra ao administrador os itens permitidos, agrupados em Cuidado e Gestão', async () => {
    await renderShell('admin');

    expect(linkNames(mainNav())).toEqual([
      navLabels.dashboard,
      navLabels.patients,
      navLabels.records,
      navLabels.medications,
      navLabels.alerts,
      navLabels.forms,
      navLabels.reports,
      navLabels.users,
      navLabels.audit,
      navLabels.settings,
    ]);
    expect(within(mainNav()).getByText(navGroupLabels.care)).toBeVisible();
    expect(
      within(mainNav()).getByText(navGroupLabels.management),
    ).toBeVisible();
    expect(
      within(mainNav()).queryByText(navGroupLabels.platform),
    ).not.toBeInTheDocument();
  });

  it('mostra ao familiar apenas os itens de consulta', async () => {
    await renderShell('family');

    expect(linkNames(mainNav())).toEqual([
      navLabels.patients,
      navLabels.records,
      navLabels.medications,
      navLabels.alerts,
    ]);
  });

  it('marca o item da tela aberta como página atual', async () => {
    await renderShell('professional', { path: '/medicamentos' });

    expect(
      within(mainNav()).getByRole('link', { name: navLabels.medications }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(mainNav()).getByRole('link', { name: navLabels.patients }),
    ).not.toHaveAttribute('aria-current');
  });

  it('mostra o usuário, o perfil e a organização da sessão', async () => {
    await renderShell('admin');

    expect(
      screen.getByRole('button', { name: /Helena Vasconcelos/ }),
    ).toHaveTextContent('Administrador');
    expect(
      within(mainNav()).getByText('Residencial Ipê Amarelo'),
    ).toBeVisible();
  });

  it('encerra a sessão pelo Sair do menu do usuário', async () => {
    await renderShell('admin');

    fireEvent.click(screen.getByRole('button', { name: /Helena Vasconcelos/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sair' }));

    await waitFor(() =>
      expect(screen.queryByText('Conteúdo da tela')).not.toBeInTheDocument(),
    );
  });

  it('usa o menu lateral também para o cuidador', async () => {
    await renderShell('caregiver');

    expect(linkNames(mainNav())).toHaveLength(5);
    expect(
      screen.queryByRole('button', { name: 'Abrir menu' }),
    ).not.toBeInTheDocument();
  });
});

describe('AppShell no celular', () => {
  it('esconde o menu até o botão Abrir menu e o fecha ao escolher um item', async () => {
    await renderShell('professional', { width: 375 });

    expect(
      screen.queryByRole('navigation', { name: 'Menu principal' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(
      within(mainNav()).getByRole('link', { name: navLabels.alerts }),
    );

    await expect
      .poll(() => screen.queryByRole('navigation', { name: 'Menu principal' }))
      .toBeNull();
  });

  it('dá ao cuidador a barra inferior, sem o menu recolhível', async () => {
    await renderShell('caregiver', { width: 375 });

    expect(linkNames(mainNav())).toEqual([
      navLabels.patients,
      navLabels.records,
      navLabels.medications,
      navLabels.alerts,
      navLabels.forms,
    ]);
    expect(
      screen.queryByRole('button', { name: 'Abrir menu' }),
    ).not.toBeInTheDocument();
  });
});

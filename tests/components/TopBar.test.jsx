import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TopBar from '../../src/components/TopBar.jsx';
import { PATHS } from '../../src/constants/routes.js';
import { changePasswordContent } from '../../src/data/access.js';
import { profileLabels } from '../../src/data/profiles.js';
import { DEMO_PROFILES } from '../../src/services/authService.js';
import { topBarSearchContent } from '../../src/data/patientList.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { renderPage } from '../support/renderPage.jsx';
import { resetViewport } from '../support/viewport.js';

function renderTopBar(profile) {
  return renderPage(
    [
      { path: PATHS.DASHBOARD, element: <TopBar /> },
      { path: PATHS.PATIENTS, element: <p>Lista</p> },
    ],
    { profile, path: PATHS.DASHBOARD },
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('busca da barra superior', () => {
  it('abre a listagem de pacientes com o termo aplicado', async () => {
    const router = renderTopBar('admin');
    const field = await screen.findByRole('searchbox', {
      name: topBarSearchContent.label,
    });

    fireEvent.change(field, { target: { value: 'dirce' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.PATIENTS),
    );
    expect(router.state.location.search).toBe('?busca=dirce');
  });

  it('não aparece para quem não lê pacientes', async () => {
    renderTopBar('platform_admin');
    await screen.findByRole('banner');

    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('menu do usuário', () => {
  it.each(DEMO_PROFILES)(
    'oferece "Alterar senha" e "Sair" ao perfil %s',
    async (profile) => {
      renderTopBar(profile);

      fireEvent.click(
        await screen.findByRole('button', {
          name: new RegExp(profileLabels[profile]),
        }),
      );

      expect(
        await screen.findByRole('menuitem', {
          name: changePasswordContent.menuItem,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Sair' }),
      ).toBeInTheDocument();
    },
  );

  it('abre a troca de senha pelo menu', async () => {
    renderTopBar('caregiver');

    fireEvent.click(
      await screen.findByRole('button', { name: /Rosângela Prado/ }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: changePasswordContent.menuItem,
      }),
    );

    expect(
      await screen.findByRole('dialog', { name: changePasswordContent.title }),
    ).toBeInTheDocument();
  });
});

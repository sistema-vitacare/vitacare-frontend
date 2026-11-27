import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  organizationListContent as content,
  organizationStatusLabels,
} from '../../../src/data/organizationPages.js';
import OrganizationList from '../../../src/pages/Organizations/OrganizationList.jsx';
import { formatDateTime } from '../../../src/utils/format.js';
import { apiPage, apiStub } from '../../support/apiStub.js';
import {
  SOL_NASCENTE,
  VIVA_BEM,
  platformRoutes,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const LIST = 'GET /organizations';

function renderList({ path = PATHS.ORGANIZATIONS, width } = {}) {
  return renderPage(
    [
      { path: PATHS.ORGANIZATIONS, element: <OrganizationList /> },
      { path: PATHS.ORGANIZATION_NEW, element: <p>Cadastro</p> },
      {
        path: PATHS.ORGANIZATION_DETAIL,
        element: <p>Página da organização</p>,
      },
    ],
    { profile: 'platform_admin', path, width },
  );
}

function choose(label, option) {
  fireEvent.mouseDown(
    screen.getByRole('combobox', { name: new RegExp(label) }),
  );
  fireEvent.click(screen.getByRole('option', { name: option }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  apiStub().use(platformRoutes());
});

afterEach(() => {
  resetViewport();
  vi.useRealTimers();
});

describe('lista de organizações', () => {
  it('mostra nome e código, plano pelo catálogo, situação e cadastro, com link para a organização', async () => {
    renderList();

    const link = await screen.findByRole('link', {
      name: SOL_NASCENTE.tradeName,
    });
    expect(link).toHaveAttribute('href', organizationPath(SOL_NASCENTE.id));
    const cells = within(link.closest('tr')).getAllByRole('cell');
    await waitFor(() =>
      expect(cells.map((cell) => cell.textContent)).toEqual([
        `${SOL_NASCENTE.tradeName}${content.code(SOL_NASCENTE.code)}`,
        'Basic',
        organizationStatusLabels.active,
        formatDateTime(SOL_NASCENTE.createdAt),
      ]),
    );
    expect(screen.getByText(content.subtitle(2))).toBeInTheDocument();
    const inactive = screen
      .getByRole('link', { name: VIVA_BEM.tradeName })
      .closest('tr');
    expect(
      within(inactive).getByText(organizationStatusLabels.inactive),
    ).toBeInTheDocument();
    expect(within(inactive).getByText('Enterprise')).toBeInTheDocument();
    expect(apiStub().last(LIST).query).toEqual({ page: '1', limit: '20' });
  });

  it('a busca e a situação vão para o endereço e para a API e voltam à primeira página', async () => {
    const router = renderList({ path: `${PATHS.ORGANIZATIONS}?pagina=2` });

    fireEvent.change(await screen.findByLabelText(content.searchLabel), {
      target: { value: 'SOL' },
    });
    await waitFor(() =>
      expect(apiStub().last(LIST).query).toEqual({
        search: 'SOL',
        page: '1',
        limit: '20',
      }),
    );

    choose(content.statusLabel, content.statusOptions.active);

    await waitFor(() =>
      expect(apiStub().last(LIST).query).toEqual({
        search: 'SOL',
        status: 'active',
        page: '1',
        limit: '20',
      }),
    );
    expect(router.state.location.search).toBe('?busca=SOL&situacao=active');
  });

  it('mostra a lista vazia quando a API não acha nada', async () => {
    apiStub().use({ [LIST]: () => apiPage([]) });
    renderList({ path: `${PATHS.ORGANIZATIONS}?busca=nada` });

    expect(await screen.findByText(content.noResults)).toBeInTheDocument();
  });

  it('pagina pelo endereço, com a página na query', async () => {
    apiStub().use({
      [LIST]: ({ query }) =>
        apiPage([SOL_NASCENTE], { page: Number(query.page), total: 23 }),
    });
    const router = renderList();
    await screen.findByText(content.range(1, 20, 23));

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

    expect(
      await screen.findByText(content.range(21, 23, 23)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?pagina=2');
    expect(apiStub().last(LIST).query.page).toBe('2');
  });

  it('"Nova organização" leva ao cadastro', async () => {
    renderList();

    fireEvent.click(
      await screen.findByRole('link', { name: content.newOrganization }),
    );

    expect(await screen.findByText('Cadastro')).toBeInTheDocument();
  });
});

describe('celular', () => {
  it('troca a tabela por cartões, com o plano e a situação', async () => {
    renderList({ width: 375 });

    const link = await screen.findByRole('link', {
      name: SOL_NASCENTE.tradeName,
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = link.closest('li');
    expect(card).toHaveTextContent(content.code(SOL_NASCENTE.code));
    await waitFor(() => expect(card).toHaveTextContent('Basic'));
    expect(card).toHaveTextContent(organizationStatusLabels.active);
  });
});

import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  BEM_VIVER_ID,
  LAR_SAO_FRANCISCO_ID,
} from '../../../src/data/mocks/organizations.js';
import { BASIC_PLAN } from '../../../src/data/mocks/plans.js';
import {
  organizationListContent as content,
  organizationStatusLabels,
} from '../../../src/data/organizationPages.js';
import OrganizationList from '../../../src/pages/Organizations/OrganizationList.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { addOrganization } from '../../../src/services/organizationStore.js';
import { formatDateTime } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');

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

// Organizações a mais no estado, para a lista passar de uma página.
function addOrganizations(count) {
  for (let index = 1; index <= count; index += 1) {
    const id = `0f9a3c10-0000-5000-8000-${String(index).padStart(12, '0')}`;
    addOrganization(
      {
        id,
        code: `casa-${index}`,
        kind: 'tenant',
        tradeName: `Casa ${String(index).padStart(2, '0')}`,
        legalName: null,
        document: null,
        phone: null,
        email: null,
        status: 'active',
        usagePlanId: BASIC_PLAN.id,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        deletedAt: null,
      },
      {
        id: `6f1d0c2e-0000-5000-8000-${String(index).padStart(12, '0')}`,
        organizationId: id,
        planId: BASIC_PLAN.id,
        startsAt: NOW.toISOString(),
        endsAt: null,
        origin: 'initial',
        userLimit: null,
        patientLimit: null,
      },
    );
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
});

describe('lista de organizações', () => {
  it('mostra nome e código, plano pelo catálogo, situação e cadastro, com link para a organização', async () => {
    renderList();

    const link = await screen.findByRole('link', { name: 'Clínica Bem Viver' });
    expect(link).toHaveAttribute('href', organizationPath(BEM_VIVER_ID));
    const cells = within(link.closest('tr')).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual([
      `Clínica Bem Viver${content.code('bem-viver')}`,
      'Basic',
      organizationStatusLabels.active,
      formatDateTime('2026-09-15T12:00:00.000Z'),
    ]);
    expect(screen.getByText(content.subtitle(3))).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('link', { name: 'Lar São Francisco' }).closest('tr'),
      ).getByText(organizationStatusLabels.inactive),
    ).toBeInTheDocument();
  });

  it('a busca e a situação vão para o endereço e voltam à primeira página', async () => {
    const router = renderList({ path: `${PATHS.ORGANIZATIONS}?pagina=2` });

    fireEvent.change(await screen.findByLabelText(content.searchLabel), {
      target: { value: 'SÃO' },
    });
    expect(
      await screen.findByRole('link', { name: 'Lar São Francisco' }),
    ).toHaveAttribute('href', organizationPath(LAR_SAO_FRANCISCO_ID));
    expect(
      screen.queryByRole('link', { name: 'Clínica Bem Viver' }),
    ).not.toBeInTheDocument();

    choose(content.statusLabel, content.statusOptions.active);

    expect(await screen.findByText(content.noResults)).toBeInTheDocument();
    expect(router.state.location.search).toBe(
      '?busca=S%C3%83O&situacao=active',
    );
  });

  it('pagina pelo endereço', async () => {
    addOrganizations(20);
    const router = renderList();
    await screen.findByText(content.range(1, 20, 23));

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

    expect(
      await screen.findByText(content.range(21, 23, 23)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?pagina=2');
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

    const link = await screen.findByRole('link', { name: 'Clínica Bem Viver' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = link.closest('li');
    expect(card).toHaveTextContent(content.code('bem-viver'));
    expect(card).toHaveTextContent('Basic');
    expect(card).toHaveTextContent(organizationStatusLabels.active);
  });
});

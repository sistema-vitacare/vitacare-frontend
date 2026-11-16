import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import { navLabels } from '../../../src/data/navigation.js';
import { BEM_VIVER_ID } from '../../../src/data/mocks/organizations.js';
import { platformOrganization } from '../../../src/data/mocks/platform.js';
import {
  organizationFieldLabels as labels,
  organizationFormContent as form,
} from '../../../src/data/organizationFields.js';
import { organizationDataContent } from '../../../src/data/organizationPages.js';
import {
  organizationDetailContent as content,
  organizationPlanContent,
} from '../../../src/data/organizationPlanPages.js';
import OrganizationDetailPage from '../../../src/pages/Organizations/OrganizationDetailPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';

function renderDetail(organizationId) {
  return renderPage(
    [
      { path: PATHS.ORGANIZATIONS, element: <p>Lista</p> },
      { path: PATHS.ORGANIZATION_DETAIL, element: <OrganizationDetailPage /> },
    ],
    { profile: 'platform_admin', path: organizationPath(organizationId) },
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-16T15:00:00.000Z'));
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('página da organização', () => {
  it('mostra o nome no título, com a volta à lista, os dados e o plano', async () => {
    renderDetail(BEM_VIVER_ID);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Clínica Bem Viver',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: navLabels.organizations }),
    ).toHaveAttribute('href', PATHS.ORGANIZATIONS);
    expect(
      screen.getByRole('region', { name: organizationDataContent.title }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', {
        name: organizationPlanContent.title,
      }),
    ).toBeInTheDocument();
  });

  it('a edição aparece no aviso e no título', async () => {
    renderDetail(BEM_VIVER_ID);
    const data = await screen.findByRole('region', {
      name: organizationDataContent.title,
    });

    fireEvent.click(
      within(data).getByRole('button', { name: organizationDataContent.edit }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });
    fireEvent.change(
      within(dialog).getByLabelText(labels.tradeName, { exact: false }),
      { target: { value: 'Clínica Bem Viver Centro' } },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(
      await screen.findByText(organizationDataContent.saved),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Clínica Bem Viver Centro',
      }),
    ).toBeInTheDocument();
  });

  it('organização que não existe mostra o aviso e volta à lista', async () => {
    renderDetail('00000000-0000-5000-8000-000000000000');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: content.backToList }));
    expect(await screen.findByText('Lista')).toBeInTheDocument();
  });

  it('a organização da plataforma não é cliente: só os dados, sem plano nem Inativar', async () => {
    renderDetail(platformOrganization.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'VitaCare' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: organizationDataContent.deactivate.action,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: organizationPlanContent.title }),
    ).not.toBeInTheDocument();
  });
});

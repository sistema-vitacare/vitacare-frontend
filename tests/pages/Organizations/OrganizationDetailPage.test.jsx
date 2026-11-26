import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import { navLabels } from '../../../src/data/navigation.js';
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
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  PLATFORM_ORGANIZATION,
  SOL_NASCENTE,
  platformRoutes,
} from '../../support/fixtures/organizations.js';
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
  apiStub().use(
    platformRoutes({ organizations: [SOL_NASCENTE, PLATFORM_ORGANIZATION] }),
  );
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('página da organização', () => {
  it('mostra o nome no título, com a volta à lista, os dados e o plano', async () => {
    renderDetail(SOL_NASCENTE.id);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: SOL_NASCENTE.tradeName,
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
    let organization = SOL_NASCENTE;
    apiStub().use({
      'GET /organizations/:organizationId': () => ({
        data: organization,
        meta: {},
      }),
      'PATCH /organizations/:organizationId': ({ body }) => {
        organization = { ...organization, ...body };
        return { data: organization, meta: {} };
      },
    });
    renderDetail(SOL_NASCENTE.id);
    const data = await screen.findByRole('region', {
      name: organizationDataContent.title,
    });

    fireEvent.click(
      within(data).getByRole('button', { name: organizationDataContent.edit }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });
    fireEvent.change(
      within(dialog).getByLabelText(labels.tradeName, { exact: false }),
      { target: { value: 'Clínica Sol Nascente Centro' } },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(
      await screen.findByText(organizationDataContent.saved),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Clínica Sol Nascente Centro',
      }),
    ).toBeInTheDocument();
  });

  it('a situação mudada por outra pessoa aparece como aviso de atenção', async () => {
    const message = 'A organização já está inativa.';
    let organization = SOL_NASCENTE;
    apiStub().use({
      'GET /organizations/:organizationId': () => ({
        data: organization,
        meta: {},
      }),
      'POST /organizations/:organizationId/deactivate': () => {
        organization = { ...organization, status: 'inactive' };
        return apiFailure(409, 'ORGANIZATION_ALREADY_INACTIVE', message);
      },
    });
    renderDetail(SOL_NASCENTE.id);
    const data = await screen.findByRole('region', {
      name: organizationDataContent.title,
    });
    fireEvent.click(
      within(data).getByRole('button', {
        name: organizationDataContent.deactivate.action,
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: organizationDataContent.deactivate.title,
    });
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: organizationDataContent.deactivate.action,
      }),
    );

    const notice = await screen.findByText(message);
    expect(notice.closest('.MuiAlert-root')).toHaveClass(
      'MuiAlert-colorWarning',
    );
    expect(
      await screen.findByRole('button', {
        name: organizationDataContent.reactivate.action,
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
    renderDetail(PLATFORM_ORGANIZATION.id);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: PLATFORM_ORGANIZATION.tradeName,
      }),
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

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { organizationListContent } from '../../../src/data/organizationPages.js';
import { pendingRequestsContent } from '../../../src/data/organizationPlanPages.js';
import OrganizationListPage from '../../../src/pages/Organizations/OrganizationListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { apiStub } from '../../support/apiStub.js';
import {
  SOL_NASCENTE,
  VIVA_BEM,
  apiChangeRequest,
  platformRoutes,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-16T15:00:00.000Z'));
  apiStub().use(platformRoutes({ requests: [apiChangeRequest()] }));
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('página das organizações', () => {
  it('mostra a fila de solicitações no topo, antes dos filtros e da lista', async () => {
    renderPage(
      [{ path: PATHS.ORGANIZATIONS, element: <OrganizationListPage /> }],
      {
        profile: 'platform_admin',
        path: PATHS.ORGANIZATIONS,
      },
    );

    const queue = await screen.findByRole('region', {
      name: pendingRequestsContent.title,
    });
    expect(
      await within(queue).findByRole('link', { name: SOL_NASCENTE.tradeName }),
    ).toBeInTheDocument();
    const search = screen.getByLabelText(organizationListContent.searchLabel);
    expect(
      queue.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: organizationListContent.title,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('table')).toHaveTextContent(
      VIVA_BEM.tradeName,
    );
  });
});

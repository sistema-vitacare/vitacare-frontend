import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import { pendingRequestsContent as content } from '../../../src/data/organizationPlanPages.js';
import PendingRequests from '../../../src/pages/Organizations/PendingRequests.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { formatDateTime } from '../../../src/utils/format.js';
import { apiStub } from '../../support/apiStub.js';
import {
  SOL_NASCENTE,
  apiChangeRequest,
  platformRoutes,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const REQUEST = apiChangeRequest({
  notes: 'Vamos abrir a segunda unidade e passar de 10 usuários.',
});

function renderQueue() {
  return renderPage(
    [
      {
        path: PATHS.ORGANIZATIONS,
        element: (
          <>
            <PendingRequests />
            <p>Lista</p>
          </>
        ),
      },
      {
        path: PATHS.ORGANIZATION_DETAIL,
        element: <p>Página da organização</p>,
      },
    ],
    { profile: 'platform_admin', path: PATHS.ORGANIZATIONS },
  );
}

// Uma volta do relógio basta para as respostas do stub chegarem.
const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('solicitações em análise', () => {
  it('mostram a organização pela consulta dela, os planos, a data e a observação, levando à organização', async () => {
    apiStub().use(platformRoutes({ requests: [REQUEST] }));
    renderQueue();

    const queue = await screen.findByRole('region', { name: content.title });
    const link = await within(queue).findByRole('link', {
      name: SOL_NASCENTE.tradeName,
    });
    expect(link).toHaveAttribute('href', organizationPath(SOL_NASCENTE.id));
    const item = link.closest('li');
    expect(item).toHaveTextContent(content.change('Basic', 'Enterprise'));
    expect(item).toHaveTextContent(
      content.requestedAt(formatDateTime(REQUEST.createdAt)),
    );
    expect(item).toHaveTextContent(content.notes(REQUEST.notes));
    expect(apiStub().last('GET /plan-change-requests').query).toEqual({
      status: 'pending',
      limit: '100',
    });
    expect(apiStub().last('GET /organizations/:organizationId').params).toEqual(
      { organizationId: SOL_NASCENTE.id },
    );
  });

  it('a seção some sem solicitação em análise', async () => {
    apiStub().use(platformRoutes({ requests: [] }));
    renderQueue();
    await screen.findByText('Lista');

    await settle();

    expect(
      screen.queryByRole('region', { name: content.title }),
    ).not.toBeInTheDocument();
  });
});

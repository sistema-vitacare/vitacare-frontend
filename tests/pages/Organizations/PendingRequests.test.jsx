import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import { BEM_VIVER_ID } from '../../../src/data/mocks/organizations.js';
import { pendingRequestsContent as content } from '../../../src/data/organizationPlanPages.js';
import PendingRequests from '../../../src/pages/Organizations/PendingRequests.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { changeChangeRequest } from '../../../src/services/organizationStore.js';
import { formatDateTime } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');
// Solicitação simulada da Bem Viver, do Basic para o Enterprise.
const SEEDED_REQUEST_ID = 'c4a9e000-0000-5000-9000-000000000001';

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

// As consultas simuladas não esperam nos testes; uma volta do relógio basta
// para todas terminarem.
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
  it('mostram a organização, os planos, a data e a observação, levando à organização', async () => {
    renderQueue();

    const queue = await screen.findByRole('region', { name: content.title });
    const link = await within(queue).findByRole('link', {
      name: 'Clínica Bem Viver',
    });
    expect(link).toHaveAttribute('href', organizationPath(BEM_VIVER_ID));
    const item = link.closest('li');
    expect(item).toHaveTextContent(content.change('Basic', 'Enterprise'));
    expect(item).toHaveTextContent(
      content.requestedAt(formatDateTime('2026-11-14T15:00:00.000Z')),
    );
    expect(item).toHaveTextContent(
      content.notes('Vamos abrir a segunda unidade e passar de 10 usuários.'),
    );
  });

  it('a seção some sem solicitação em análise', async () => {
    changeChangeRequest(SEEDED_REQUEST_ID, { status: 'rejected' });
    renderQueue();
    await screen.findByText('Lista');

    await settle();

    expect(
      screen.queryByRole('region', { name: content.title }),
    ).not.toBeInTheDocument();
  });
});

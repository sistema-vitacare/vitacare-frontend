import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import { BEM_VIVER_ID } from '../../../src/data/mocks/organizations.js';
import {
  organizationPlanContent as content,
  planTermFieldErrors,
  planTermFormContent as form,
  rejectRequestContent as reject,
} from '../../../src/data/organizationPlanPages.js';
import { planSummaryContent as summary } from '../../../src/data/planSummary.js';
import OrganizationPlan from '../../../src/pages/Organizations/OrganizationPlan.jsx';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { getOrganizationPlan } from '../../../src/services/organizationService.js';
import { changeChangeRequest } from '../../../src/services/organizationStore.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');
// Solicitação simulada da Bem Viver, do Basic para o Enterprise.
const SEEDED_REQUEST_ID = 'c4a9e000-0000-5000-9000-000000000001';

// A página da organização mostra o aviso do que mudou, como este apoio.
function Harness() {
  const { organizationId } = useParams();
  const [notice, setNotice] = useState(null);
  return (
    <>
      {notice ? <p role="status">{notice}</p> : null}
      <OrganizationPlan organizationId={organizationId} onChanged={setNotice} />
    </>
  );
}

function renderPlan(organizationId = BEM_VIVER_ID) {
  return renderPage(
    [{ path: PATHS.ORGANIZATION_DETAIL, element: <Harness /> }],
    { profile: 'platform_admin', path: organizationPath(organizationId) },
  );
}

const section = () => screen.findByRole('region', { name: content.title });

async function openDialog(action, title) {
  fireEvent.click(
    await within(await section()).findByRole('button', { name: action }),
  );
  return screen.findByRole('dialog', { name: title });
}

async function choosePlan(dialog, name) {
  const select = within(dialog).getByRole('combobox', {
    name: new RegExp(form.plan),
  });
  await waitFor(() =>
    expect(select).not.toHaveAttribute('aria-disabled', 'true'),
  );
  fireEvent.mouseDown(select);
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(name) }),
  );
}

function type(dialog, label, value) {
  fireEvent.change(within(dialog).getByLabelText(label, { exact: false }), {
    target: { value },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('plano da organização', () => {
  it('mostra o plano pelo resumo comum, com o aviso de vencimento, o uso e a solicitação em análise', async () => {
    renderPlan();

    const plan = await section();
    expect(await within(plan).findByText('Basic')).toBeInTheDocument();
    expect(within(plan).getByRole('alert')).toHaveTextContent(
      /^O plano vence em 21\/11\/2026 às 23:59/,
    );
    expect(
      within(plan).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('7', '10'));
    expect(
      within(plan).getByRole('group', { name: content.pendingTitle }),
    ).toHaveTextContent('Basic → Enterprise');
  });
});

describe('atribuição', () => {
  it('limites só no plano expansível, e o fim escolhido vale até 23:59 de Brasília', async () => {
    renderPlan();
    const dialog = await openDialog(content.assign, form.assignTitle);

    expect(within(dialog).queryByLabelText(form.userLimit)).toBeNull();
    expect(
      within(dialog).getByText(form.fixedLimits('10', '200')),
    ).toBeInTheDocument();
    await choosePlan(dialog, 'Enterprise');
    type(dialog, form.endsAt, '2026-12-20');
    type(dialog, form.userLimit, '60');
    type(dialog, form.reason, 'Contrato anual.');
    fireEvent.click(within(dialog).getByRole('button', { name: form.assign }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.assigned,
    );
    const plan = await section();
    expect(await within(plan).findByText('Enterprise')).toBeInTheDocument();
    expect(
      within(plan).getByText(summary.term('16/11/2026', '20/12/2026')),
    ).toBeInTheDocument();
    expect(
      within(plan).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('7', '60'));
    // A atribuição não decide a solicitação em análise.
    expect(
      within(plan).getByRole('group', { name: content.pendingTitle }),
    ).toBeInTheDocument();
    expect((await getOrganizationPlan(BEM_VIVER_ID)).data.term).toMatchObject({
      endsAt: '2026-12-21T02:59:59.999Z',
      userLimit: 60,
      patientLimit: null,
    });
  });

  it('aponta limite abaixo do catálogo e fim no passado antes do envio', async () => {
    renderPlan();
    const dialog = await openDialog(content.assign, form.assignTitle);
    await choosePlan(dialog, 'Enterprise');
    type(dialog, form.endsAt, '2026-11-15');
    type(dialog, form.patientLimit, '500');
    // Se a tela chamasse a API, a falha apareceria no lugar dos campos.
    failNextRequest();

    fireEvent.click(within(dialog).getByRole('button', { name: form.assign }));

    expect(
      await within(dialog).findByText(planTermFieldErrors.endsAt.IN_PAST),
    ).toBeInTheDocument();
    type(dialog, form.endsAt, '');
    fireEvent.click(within(dialog).getByRole('button', { name: form.assign }));
    expect(
      await within(dialog).findByText(
        planTermFieldErrors.patientLimit.BELOW_CATALOG,
      ),
    ).toBeInTheDocument();
  });
});

describe('decisão da solicitação', () => {
  it('aprova pela regra da atribuição, e o plano pedido passa a valer', async () => {
    renderPlan();
    const dialog = await openDialog(content.approve, form.approveTitle);

    expect(dialog).toHaveTextContent(form.approveIntro('Enterprise'));
    type(dialog, form.userLimit, '80');
    type(dialog, form.decisionNote, 'Segunda unidade confirmada.');
    fireEvent.click(within(dialog).getByRole('button', { name: form.approve }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.approved,
    );
    const plan = await section();
    expect(await within(plan).findByText('Enterprise')).toBeInTheDocument();
    expect(
      within(plan).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('7', '80'));
    expect(
      within(plan).queryByRole('group', { name: content.pendingTitle }),
    ).not.toBeInTheDocument();
  });

  it('recusa só com justificativa, e o plano continua', async () => {
    renderPlan();
    const dialog = await openDialog(content.reject, reject.title);

    fireEvent.click(
      within(dialog).getByRole('button', { name: reject.reject }),
    );
    expect(
      await within(dialog).findByText(planTermFieldErrors.note.MIN_LENGTH),
    ).toBeInTheDocument();
    type(dialog, reject.decisionNote, 'Sem a segunda unidade confirmada.');
    fireEvent.click(
      within(dialog).getByRole('button', { name: reject.reject }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.rejected,
    );
    const plan = await section();
    expect(await within(plan).findByText('Basic')).toBeInTheDocument();
    expect(
      within(plan).queryByRole('group', { name: content.pendingTitle }),
    ).not.toBeInTheDocument();
  });

  it('a solicitação decidida em outro lugar mostra a mensagem da API', async () => {
    renderPlan();
    const dialog = await openDialog(content.reject, reject.title);
    changeChangeRequest(SEEDED_REQUEST_ID, { status: 'cancelled' });

    type(dialog, reject.decisionNote, 'Sem a segunda unidade confirmada.');
    fireEvent.click(
      within(dialog).getByRole('button', { name: reject.reject }),
    );

    expect(
      await within(dialog).findByText(
        'A solicitação já foi decidida ou cancelada.',
      ),
    ).toBeInTheDocument();
  });
});

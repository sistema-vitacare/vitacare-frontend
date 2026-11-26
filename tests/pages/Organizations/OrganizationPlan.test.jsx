import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  organizationPlanContent as content,
  planTermFieldErrors,
  planTermFormContent as form,
  rejectRequestContent as reject,
} from '../../../src/data/organizationPlanPages.js';
import { planSummaryContent as summary } from '../../../src/data/planSummary.js';
import OrganizationPlan from '../../../src/pages/Organizations/OrganizationPlan.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  BASIC,
  ENTERPRISE,
  PLANS,
  SOL_NASCENTE,
  apiChangeRequest,
  apiOrganizationPlan,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const PLAN = 'GET /organizations/:organizationId/plan';
const REQUEST = apiChangeRequest();
const NOT_PENDING = 'A solicitação já foi decidida ou cancelada.';
const EXPIRY =
  'O plano vence em 21/11/2026 às 23:59 (horário de Brasília). Depois disso, novos cadastros e reativações de usuários e pacientes ficam bloqueados até a renovação. Solicite a renovação na área de plano.';

const planOf = (options = {}) =>
  apiOrganizationPlan({ organizationId: SOL_NASCENTE.id, ...options });

// O plano que a API devolve agora; as ações do teste o trocam, como o banco
// faria.
let current;

// A página da organização mostra o aviso do que mudou, com a severidade,
// como este apoio.
function Harness() {
  const { organizationId } = useParams();
  const [notice, setNotice] = useState(null);
  return (
    <>
      {notice ? (
        <p role="status" data-severity={notice.severity}>
          {notice.text}
        </p>
      ) : null}
      <OrganizationPlan
        organizationId={organizationId}
        onChanged={(text, severity = 'success') =>
          setNotice({ text, severity })
        }
      />
    </>
  );
}

function renderPlan() {
  return renderPage(
    [{ path: PATHS.ORGANIZATION_DETAIL, element: <Harness /> }],
    { profile: 'platform_admin', path: organizationPath(SOL_NASCENTE.id) },
  );
}

const section = () => screen.findByRole('region', { name: content.title });
const planLoads = () =>
  apiStub().requests.filter((request) => request.key === PLAN).length;

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
  current = planOf({
    endsAt: '2026-11-22T02:59:00.000Z',
    expiryWarning: 'within_7_days',
    message: EXPIRY,
    pendingChangeRequest: REQUEST,
  });
  apiStub().use({
    [PLAN]: () => current,
    'GET /plans': () => ({ data: PLANS, meta: {} }),
  });
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('plano da organização', () => {
  it('mostra o plano da API pelo resumo comum, com o aviso de vencimento, o uso e a solicitação em análise', async () => {
    renderPlan();

    const plan = await section();
    expect(await within(plan).findByText('Basic')).toBeInTheDocument();
    expect(within(plan).getByRole('alert')).toHaveTextContent(EXPIRY);
    expect(
      within(plan).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('7', '10'));
    expect(
      within(plan).getByRole('group', { name: content.pendingTitle }),
    ).toHaveTextContent('Basic → Enterprise');
    expect(apiStub().last(PLAN).params).toEqual({
      organizationId: SOL_NASCENTE.id,
    });
  });
});

describe('atribuição', () => {
  it('limites só no plano expansível, e o fim escolhido vai à API como 23:59 de Brasília', async () => {
    apiStub().use({
      'PUT /organizations/:organizationId/plan': ({ body }) => {
        current = planOf({
          plan: ENTERPRISE,
          endsAt: body.endsAt,
          origin: 'assignment',
          userLimit: body.userLimit,
          pendingChangeRequest: REQUEST,
        });
        return current;
      },
    });
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
    expect(
      apiStub().last('PUT /organizations/:organizationId/plan'),
    ).toMatchObject({
      params: { organizationId: SOL_NASCENTE.id },
      body: {
        planId: ENTERPRISE.id,
        endsAt: '2026-12-21T02:59:59.999Z',
        userLimit: 60,
        reason: 'Contrato anual.',
      },
    });
    const plan = await section();
    expect(await within(plan).findByText('Enterprise')).toBeInTheDocument();
    expect(
      within(plan).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('7', '60'));
    // A atribuição não decide a solicitação em análise.
    expect(
      within(plan).getByRole('group', { name: content.pendingTitle }),
    ).toBeInTheDocument();
  });

  it('aponta limite abaixo do catálogo e fim no passado antes do envio', async () => {
    renderPlan();
    const dialog = await openDialog(content.assign, form.assignTitle);
    await choosePlan(dialog, 'Enterprise');
    type(dialog, form.endsAt, '2026-11-15');
    type(dialog, form.patientLimit, '500');

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
    expect(
      apiStub().last('PUT /organizations/:organizationId/plan'),
    ).toBeUndefined();
  });
});

describe('decisão da solicitação', () => {
  it('aprova pela regra da atribuição, e o plano pedido passa a valer', async () => {
    apiStub().use({
      'POST /plan-change-requests/:requestId/approve': ({ body }) => {
        current = planOf({
          plan: ENTERPRISE,
          origin: 'change_request',
          userLimit: body.userLimit,
        });
        return { data: { ...REQUEST, status: 'approved' }, meta: {} };
      },
    });
    renderPlan();
    const dialog = await openDialog(content.approve, form.approveTitle);

    expect(dialog).toHaveTextContent(form.approveIntro('Enterprise'));
    type(dialog, form.userLimit, '80');
    type(dialog, form.decisionNote, 'Segunda unidade confirmada.');
    fireEvent.click(within(dialog).getByRole('button', { name: form.approve }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.approved,
    );
    expect(
      apiStub().last('POST /plan-change-requests/:requestId/approve'),
    ).toMatchObject({
      params: { requestId: REQUEST.id },
      body: { userLimit: 80, decisionNote: 'Segunda unidade confirmada.' },
    });
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
    apiStub().use({
      'POST /plan-change-requests/:requestId/reject': () => {
        current = planOf();
        return { data: { ...REQUEST, status: 'rejected' }, meta: {} };
      },
    });
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
    expect(
      apiStub().last('POST /plan-change-requests/:requestId/reject').body,
    ).toEqual({ decisionNote: 'Sem a segunda unidade confirmada.' });
    const plan = await section();
    expect(await within(plan).findByText(BASIC.name)).toBeInTheDocument();
    expect(
      within(plan).queryByRole('group', { name: content.pendingTitle }),
    ).not.toBeInTheDocument();
  });

  describe('situação mudada por outra pessoa', () => {
    const cancelledMeanwhile = () => {
      current = planOf();
      return apiFailure(409, 'PLAN_CHANGE_REQUEST_NOT_PENDING', NOT_PENDING);
    };

    it('a recusa da solicitação já decidida fecha o diálogo, recarrega e avisa', async () => {
      apiStub().use({
        'POST /plan-change-requests/:requestId/reject': cancelledMeanwhile,
      });
      renderPlan();
      const dialog = await openDialog(content.reject, reject.title);
      const before = planLoads();

      type(dialog, reject.decisionNote, 'Sem a segunda unidade confirmada.');
      fireEvent.click(
        within(dialog).getByRole('button', { name: reject.reject }),
      );

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent(NOT_PENDING);
      expect(notice).toHaveAttribute('data-severity', 'warning');
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: reject.title }),
        ).not.toBeInTheDocument(),
      );
      expect(planLoads()).toBe(before + 1);
      await waitFor(async () =>
        expect(
          within(await section()).queryByRole('group', {
            name: content.pendingTitle,
          }),
        ).not.toBeInTheDocument(),
      );
    });

    it('a aprovação da solicitação já decidida também fecha, recarrega e avisa', async () => {
      apiStub().use({
        'POST /plan-change-requests/:requestId/approve': cancelledMeanwhile,
      });
      renderPlan();
      const dialog = await openDialog(content.approve, form.approveTitle);

      fireEvent.click(
        within(dialog).getByRole('button', { name: form.approve }),
      );

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent(NOT_PENDING);
      expect(notice).toHaveAttribute('data-severity', 'warning');
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: form.approveTitle }),
        ).not.toBeInTheDocument(),
      );
    });

    it('outro erro continua no diálogo, sem recarregar', async () => {
      apiStub().use({
        'POST /plan-change-requests/:requestId/reject': () =>
          apiFailure(
            500,
            'INTERNAL_ERROR',
            'Não foi possível concluir a operação. Tente novamente.',
          ),
      });
      renderPlan();
      const dialog = await openDialog(content.reject, reject.title);
      const before = planLoads();

      type(dialog, reject.decisionNote, 'Sem a segunda unidade confirmada.');
      fireEvent.click(
        within(dialog).getByRole('button', { name: reject.reject }),
      );

      expect(
        await within(dialog).findByText(reject.unexpected),
      ).toBeInTheDocument();
      expect(planLoads()).toBe(before);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});

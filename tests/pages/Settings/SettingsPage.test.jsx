import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import {
  organizationFieldErrors,
  organizationFieldLabels,
  organizationFormContent as organizationForm,
} from '../../../src/data/organizationFields.js';
import {
  planFeatureLabels,
  planSummaryContent as summary,
} from '../../../src/data/planSummary.js';
import {
  changeRequestFormContent as form,
  organizationSectionContent as organizationSection,
  planSectionContent as plan,
  settingsContent as content,
} from '../../../src/data/settingsPages.js';
import SettingsPage from '../../../src/pages/Settings/SettingsPage.jsx';
import { apiFailure, apiStub, reply } from '../../support/apiStub.js';
import {
  BASIC,
  ENTERPRISE,
  OWN_ORGANIZATION,
  PLATFORM_ORGANIZATION,
  apiChangeRequest,
  apiOrganizationPlan,
  settingsRoutes,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const PLAN = 'GET /organizations/me/plan';
const PENDING = apiChangeRequest({
  organizationId: OWN_ORGANIZATION.id,
  currentPlan: ENTERPRISE,
  requestedPlan: BASIC,
  notes: 'Reduzir custos no próximo semestre.',
});
const NOT_PENDING = 'A solicitação já foi decidida ou cancelada.';

const ownPlan = (options = {}) =>
  apiOrganizationPlan({
    organizationId: OWN_ORGANIZATION.id,
    plan: ENTERPRISE,
    usage: { users: 11, patients: 22 },
    ...options,
  });

// O plano que a API devolve agora; o pedido e o cancelamento o trocam, como
// o banco faria.
let currentPlan;

function servePlan(planResponse) {
  currentPlan = planResponse;
  apiStub().use({ [PLAN]: () => currentPlan });
}

function renderSettings({ profile = 'admin', width } = {}) {
  return renderPage([{ path: PATHS.SETTINGS, element: <SettingsPage /> }], {
    profile,
    path: PATHS.SETTINGS,
    width,
  });
}

const region = (name) => screen.findByRole('region', { name });

// Valor de um rótulo na lista de definições.
const valueOf = (section, label) =>
  within(section).getByText(label).nextElementSibling;

const planLoads = () =>
  apiStub().requests.filter((request) => request.key === PLAN).length;

async function openRequest() {
  const section = await region(plan.title);
  fireEvent.click(within(section).getByRole('button', { name: plan.request }));
  return screen.findByRole('dialog', { name: form.title });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  apiStub().use(settingsRoutes());
  servePlan(ownPlan());
});

afterEach(() => {
  resetViewport();
  vi.useRealTimers();
});

describe('organização', () => {
  it('mostra os dados da organização da sessão que a API devolve', async () => {
    renderSettings();

    const section = await region(organizationSection.title);
    const fields = organizationFieldLabels;
    expect(valueOf(section, fields.tradeName)).toHaveTextContent(
      OWN_ORGANIZATION.tradeName,
    );
    expect(valueOf(section, fields.legalName)).toHaveTextContent(
      OWN_ORGANIZATION.legalName,
    );
    expect(valueOf(section, fields.document)).toHaveTextContent(
      OWN_ORGANIZATION.document,
    );
    expect(valueOf(section, fields.code)).toHaveTextContent(
      OWN_ORGANIZATION.code,
    );
  });

  it('edita enviando só o que mudou e mostra o salvo', async () => {
    let organization = OWN_ORGANIZATION;
    apiStub().use({
      'GET /organizations/me': () => ({ data: organization, meta: {} }),
      'PATCH /organizations/me': ({ body }) => {
        organization = { ...organization, ...body };
        return { data: organization, meta: {} };
      },
    });
    renderSettings();
    const section = await region(organizationSection.title);

    fireEvent.click(
      within(section).getByRole('button', { name: organizationSection.edit }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: organizationForm.title,
    });
    fireEvent.change(
      within(dialog).getByLabelText(organizationFieldLabels.phone),
      { target: { value: '(16) 3624-0000' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(organizationFieldLabels.legalName),
      { target: { value: '' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: organizationForm.save }),
    );

    expect(
      await screen.findByText(organizationSection.saved),
    ).toBeInTheDocument();
    expect(apiStub().last('PATCH /organizations/me').body).toEqual({
      phone: '(16) 3624-0000',
      legalName: null,
    });
    await waitFor(() =>
      expect(
        valueOf(
          screen.getByRole('region', { name: organizationSection.title }),
          organizationFieldLabels.phone,
        ),
      ).toHaveTextContent('(16) 3624-0000'),
    );
    expect(
      valueOf(
        screen.getByRole('region', { name: organizationSection.title }),
        organizationFieldLabels.legalName,
      ),
    ).toHaveTextContent(content.none);
  });

  it('aponta o campo antes do envio e o documento repetido que a API recusa', async () => {
    apiStub().use({
      'PATCH /organizations/me': () =>
        apiFailure(
          409,
          'ORGANIZATION_DOCUMENT_TAKEN',
          'Já existe uma organização com este documento.',
          [{ field: 'document', code: 'DUPLICATE' }],
        ),
    });
    renderSettings();
    const section = await region(organizationSection.title);
    fireEvent.click(
      within(section).getByRole('button', { name: organizationSection.edit }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: organizationForm.title,
    });

    fireEvent.change(
      within(dialog).getByLabelText(organizationFieldLabels.tradeName, {
        exact: false,
      }),
      { target: { value: '' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: organizationForm.save }),
    );
    expect(
      await within(dialog).findByText(
        organizationFieldErrors.tradeName.MIN_LENGTH,
      ),
    ).toBeInTheDocument();
    expect(apiStub().last('PATCH /organizations/me')).toBeUndefined();

    fireEvent.change(
      within(dialog).getByLabelText(organizationFieldLabels.tradeName, {
        exact: false,
      }),
      { target: { value: OWN_ORGANIZATION.tradeName } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(organizationFieldLabels.document),
      { target: { value: '11.222.333/0001-81' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: organizationForm.save }),
    );
    expect(
      await within(dialog).findByText(
        organizationFieldErrors.document.DUPLICATE,
      ),
    ).toBeInTheDocument();
  });
});

describe('plano e uso', () => {
  it('mostra o plano da API com descrição e recursos, a vigência e o uso', async () => {
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByText(ENTERPRISE.name)).toBeInTheDocument();
    expect(
      within(section).getByText(ENTERPRISE.description),
    ).toBeInTheDocument();
    const features = within(section).getByRole('list', {
      name: summary.featuresLabel,
    });
    expect(within(features).getAllByRole('listitem')).toHaveLength(9);
    expect(features).toHaveTextContent(planFeatureLabels.operational_dashboard);
    expect(
      within(section).getByText(summary.term('01/11/2026', null)),
    ).toBeInTheDocument();
    const usage = within(section).getByRole('list', {
      name: summary.usageLabel,
    });
    expect(usage).toHaveTextContent(summary.usage.users);
    expect(usage).toHaveTextContent(summary.usageValue('11', '50'));
    expect(usage).toHaveTextContent(summary.usage.patients);
    expect(usage).toHaveTextContent(summary.usageValue('22', '1.000'));
  });

  it('mostra o aviso de vencimento que a API manda', async () => {
    const message =
      'O plano vence em 15/11/2026 às 00:00 (horário de Brasília). Depois disso, novos cadastros e reativações de usuários e pacientes ficam bloqueados até a renovação. Solicite a renovação na área de plano.';
    servePlan(
      ownPlan({
        endsAt: '2026-11-15T03:00:00.000Z',
        expiryWarning: 'within_7_days',
        message,
      }),
    );
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByRole('alert')).toHaveTextContent(message);
  });

  it('com a vigência vencida, mostra a situação e o que a API diz que fica bloqueado', async () => {
    const message =
      'O plano venceu em 10/11/2026 às 00:00 (horário de Brasília). Novos cadastros e reativações de usuários e pacientes estão bloqueados até a renovação; a consulta e os registros continuam. Solicite a renovação na área de plano.';
    servePlan(
      ownPlan({
        endsAt: '2026-11-10T03:00:00.000Z',
        expiryWarning: 'expired',
        message,
      }),
    );
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByText(summary.expired)).toBeInTheDocument();
    expect(within(section).getByRole('alert')).toHaveTextContent(message);
  });

  it('mostra o uso como vem, mesmo acima do limite depois de um rebaixamento', async () => {
    servePlan(ownPlan({ plan: BASIC }));
    renderSettings();

    const section = await region(plan.title);
    expect(
      within(section).getByRole('list', { name: summary.usageLabel }),
    ).toHaveTextContent(summary.usageValue('11', '10'));
  });
});

describe('mudança de plano', () => {
  it('pede outro plano, que fica em análise e tira o botão de pedir', async () => {
    apiStub().use({
      'POST /plan-change-requests': () => {
        currentPlan = ownPlan({ pendingChangeRequest: PENDING });
        return reply(201, { data: PENDING, meta: {} });
      },
    });
    renderSettings();
    const dialog = await openRequest();

    expect(
      within(dialog).queryByRole('radio', { name: /Enterprise/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await within(dialog).findByRole('radio', { name: /Basic/ }),
    );
    fireEvent.change(within(dialog).getByLabelText(form.notes), {
      target: { value: 'Reduzir custos no próximo semestre.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.submit }));

    expect(await screen.findByText(plan.sent)).toBeInTheDocument();
    expect(apiStub().last('POST /plan-change-requests').body).toEqual({
      requestedPlanId: BASIC.id,
      notes: 'Reduzir custos no próximo semestre.',
    });
    const updated = await region(plan.title);
    const pending = await within(updated).findByRole('group', {
      name: plan.pendingTitle,
    });
    expect(pending).toHaveTextContent('Enterprise → Basic');
    expect(pending).toHaveTextContent(
      plan.notes('Reduzir custos no próximo semestre.'),
    );
    expect(
      within(updated).queryByRole('button', { name: plan.request }),
    ).not.toBeInTheDocument();
  });

  it('exige a escolha do plano e limita a observação antes do envio', async () => {
    renderSettings();
    const dialog = await openRequest();

    fireEvent.change(within(dialog).getByLabelText(form.notes), {
      target: { value: 'x'.repeat(501) },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.submit }));

    expect(
      await within(dialog).findByText(form.choosePlan),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(form.notesTooLong)).toBeInTheDocument();
    expect(apiStub().last('POST /plan-change-requests')).toBeUndefined();
  });

  it('cancela a solicitação em análise, com confirmação', async () => {
    servePlan(ownPlan({ pendingChangeRequest: PENDING }));
    apiStub().use({
      'POST /plan-change-requests/:requestId/cancel': () => {
        currentPlan = ownPlan();
        return { data: { ...PENDING, status: 'cancelled' }, meta: {} };
      },
    });
    renderSettings();
    const section = await region(plan.title);
    fireEvent.click(within(section).getByRole('button', { name: plan.cancel }));

    const confirm = await screen.findByRole('dialog', {
      name: plan.cancelTitle,
    });
    fireEvent.click(within(confirm).getByRole('button', { name: plan.cancel }));

    expect(await screen.findByText(plan.cancelled)).toBeInTheDocument();
    expect(
      apiStub().last('POST /plan-change-requests/:requestId/cancel').params,
    ).toEqual({ requestId: PENDING.id });
    // A seção recarrega depois que o diálogo de confirmação fecha.
    const updated = await region(plan.title);
    expect(
      await within(updated).findByRole('button', { name: plan.request }),
    ).toBeInTheDocument();
    expect(
      within(updated).queryByRole('group', { name: plan.pendingTitle }),
    ).not.toBeInTheDocument();
  });

  it('com a vigência vencida, oferece renovar o plano atual', async () => {
    servePlan(
      ownPlan({ endsAt: '2026-11-10T03:00:00.000Z', expiryWarning: 'expired' }),
    );
    renderSettings();

    const dialog = await openRequest();

    expect(
      await within(dialog).findByRole('radio', { name: /Enterprise/ }),
    ).toHaveAccessibleDescription(form.current);
  });

  describe('situação mudada por outra pessoa', () => {
    it('fecha a confirmação, recarrega o plano e mostra a mensagem quando a solicitação já foi decidida', async () => {
      servePlan(ownPlan({ pendingChangeRequest: PENDING }));
      apiStub().use({
        'POST /plan-change-requests/:requestId/cancel': () => {
          currentPlan = ownPlan({ plan: BASIC });
          return apiFailure(
            409,
            'PLAN_CHANGE_REQUEST_NOT_PENDING',
            NOT_PENDING,
          );
        },
      });
      renderSettings();
      const section = await region(plan.title);
      const before = planLoads();
      fireEvent.click(
        within(section).getByRole('button', { name: plan.cancel }),
      );
      const confirm = await screen.findByRole('dialog', {
        name: plan.cancelTitle,
      });
      fireEvent.click(
        within(confirm).getByRole('button', { name: plan.cancel }),
      );

      const notice = await screen.findByText(NOT_PENDING);
      expect(notice.closest('.MuiAlert-root')).toHaveClass(
        'MuiAlert-colorWarning',
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: plan.cancelTitle }),
        ).not.toBeInTheDocument(),
      );
      expect(planLoads()).toBe(before + 1);
      expect(
        await within(await region(plan.title)).findByText(BASIC.name),
      ).toBeInTheDocument();
    });

    it('fecha o pedido e recarrega quando outra solicitação já está em análise', async () => {
      const message =
        'Já existe uma solicitação de mudança de plano em análise. Aguarde a decisão ou cancele-a.';
      apiStub().use({
        'POST /plan-change-requests': () => {
          currentPlan = ownPlan({ pendingChangeRequest: PENDING });
          return apiFailure(
            409,
            'PLAN_CHANGE_REQUEST_ALREADY_PENDING',
            message,
          );
        },
      });
      renderSettings();
      const dialog = await openRequest();
      fireEvent.click(
        await within(dialog).findByRole('radio', { name: /Basic/ }),
      );
      fireEvent.click(
        within(dialog).getByRole('button', { name: form.submit }),
      );

      expect(await screen.findByText(message)).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: form.title }),
        ).not.toBeInTheDocument(),
      );
      expect(
        await within(await region(plan.title)).findByRole('group', {
          name: plan.pendingTitle,
        }),
      ).toBeInTheDocument();
    });

    it('outro erro continua no pedido, sem recarregar', async () => {
      apiStub().use({
        'POST /plan-change-requests': () =>
          apiFailure(
            422,
            'PLAN_CHANGE_SAME_PLAN',
            'O plano solicitado é o plano atual. Só é possível pedir o mesmo plano para renovar uma vigência vencida.',
          ),
      });
      renderSettings();
      const dialog = await openRequest();
      const before = planLoads();
      fireEvent.click(
        await within(dialog).findByRole('radio', { name: /Basic/ }),
      );
      fireEvent.click(
        within(dialog).getByRole('button', { name: form.submit }),
      );

      expect(
        await within(dialog).findByText(/O plano solicitado é o plano atual/),
      ).toBeInTheDocument();
      expect(planLoads()).toBe(before);
    });
  });
});

describe('administrador da plataforma', () => {
  it('vê e edita só a organização da plataforma, sem pedir o plano', async () => {
    apiStub().use(settingsRoutes({ organization: PLATFORM_ORGANIZATION }));
    renderSettings({ profile: 'platform_admin' });

    const section = await region(organizationSection.title);
    expect(
      valueOf(section, organizationFieldLabels.tradeName),
    ).toHaveTextContent(PLATFORM_ORGANIZATION.tradeName);
    expect(
      valueOf(section, organizationFieldLabels.legalName),
    ).toHaveTextContent(content.none);
    expect(
      within(section).getByRole('button', { name: organizationSection.edit }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: plan.title }),
    ).not.toBeInTheDocument();
    expect(planLoads()).toBe(0);
  });
});

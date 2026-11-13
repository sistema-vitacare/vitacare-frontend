import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { organization } from '../../../src/data/mocks/organization.js';
import { BASIC_PLAN, ENTERPRISE_PLAN } from '../../../src/data/mocks/plans.js';
import {
  changeRequestFormContent as form,
  organizationFieldErrors,
  organizationFormContent as organizationForm,
  organizationSectionContent as organizationSection,
  planFeatureLabels,
  planSectionContent as plan,
  settingsContent as content,
} from '../../../src/data/settingsPages.js';
import SettingsPage from '../../../src/pages/Settings/SettingsPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { changeTerm } from '../../../src/services/organizationStore.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
});

describe('organização', () => {
  it('mostra os dados da organização da sessão', async () => {
    renderSettings();

    const section = await region(organizationSection.title);
    const { fields } = organizationSection;
    expect(valueOf(section, fields.tradeName)).toHaveTextContent(
      organization.tradeName,
    );
    expect(valueOf(section, fields.legalName)).toHaveTextContent(
      organization.legalName,
    );
    expect(valueOf(section, fields.document)).toHaveTextContent(
      organization.document,
    );
    expect(valueOf(section, fields.code)).toHaveTextContent(organization.code);
  });

  it('edita os dados e mostra o salvo', async () => {
    renderSettings();
    const section = await region(organizationSection.title);

    fireEvent.click(
      within(section).getByRole('button', { name: organizationSection.edit }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: organizationForm.title,
    });
    fireEvent.change(
      within(dialog).getByLabelText(organizationSection.fields.phone),
      { target: { value: '(16) 3624-0000' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(organizationSection.fields.legalName),
      { target: { value: '' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: organizationForm.save }),
    );

    expect(
      await screen.findByText(organizationSection.saved),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        valueOf(
          screen.getByRole('region', { name: organizationSection.title }),
          organizationSection.fields.phone,
        ),
      ).toHaveTextContent('(16) 3624-0000'),
    );
    expect(
      valueOf(
        screen.getByRole('region', { name: organizationSection.title }),
        organizationSection.fields.legalName,
      ),
    ).toHaveTextContent(content.none);
  });

  it('aponta o campo antes do envio e o documento repetido que a API recusa', async () => {
    renderSettings();
    const section = await region(organizationSection.title);
    fireEvent.click(
      within(section).getByRole('button', { name: organizationSection.edit }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: organizationForm.title,
    });

    fireEvent.change(
      within(dialog).getByLabelText(organizationSection.fields.tradeName, {
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

    fireEvent.change(
      within(dialog).getByLabelText(organizationSection.fields.tradeName, {
        exact: false,
      }),
      { target: { value: organization.tradeName } },
    );
    // Documento da Clínica Bem Viver, outra organização dos dados simulados.
    fireEvent.change(
      within(dialog).getByLabelText(organizationSection.fields.document),
      { target: { value: '58.214.903/0001-07' } },
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
  it('mostra o plano com descrição e recursos, a vigência e o uso', async () => {
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByText(ENTERPRISE_PLAN.name)).toBeInTheDocument();
    expect(
      within(section).getByText(ENTERPRISE_PLAN.description),
    ).toBeInTheDocument();
    const features = within(section).getByRole('list', {
      name: plan.featuresLabel,
    });
    expect(within(features).getAllByRole('listitem')).toHaveLength(9);
    expect(features).toHaveTextContent(planFeatureLabels.operational_dashboard);
    expect(
      within(section).getByText(plan.term('02/09/2026', null)),
    ).toBeInTheDocument();
    const usage = within(section).getByRole('list', { name: plan.usageLabel });
    expect(usage).toHaveTextContent(plan.usage.users);
    expect(usage).toHaveTextContent(plan.usageValue('11', '50'));
    expect(usage).toHaveTextContent(plan.usage.patients);
    expect(usage).toHaveTextContent(plan.usageValue('22', '1.000'));
  });

  it('mostra o aviso de vencimento que a API manda', async () => {
    changeTerm(organization.id, { endsAt: '2026-11-15T03:00:00.000Z' });
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByRole('alert')).toHaveTextContent(
      'O plano vence em 15/11/2026 às 00:00 (horário de Brasília).',
    );
  });

  it('com a vigência vencida, explica o que fica bloqueado', async () => {
    changeTerm(organization.id, { endsAt: '2026-11-10T03:00:00.000Z' });
    renderSettings();

    const section = await region(plan.title);
    expect(within(section).getByText(plan.expired)).toBeInTheDocument();
    expect(within(section).getByRole('alert')).toHaveTextContent(
      'Novos cadastros e reativações de usuários e pacientes estão bloqueados até a renovação',
    );
  });

  it('mostra o uso como vem, mesmo acima do limite depois de um rebaixamento', async () => {
    changeTerm(organization.id, { planId: BASIC_PLAN.id });
    renderSettings();

    const section = await region(plan.title);
    expect(
      within(section).getByRole('list', { name: plan.usageLabel }),
    ).toHaveTextContent(plan.usageValue('11', '10'));
  });
});

describe('mudança de plano', () => {
  it('pede outro plano, que fica em análise e tira o botão de pedir', async () => {
    renderSettings();
    const section = await region(plan.title);

    fireEvent.click(
      within(section).getByRole('button', { name: plan.request }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });
    expect(
      within(dialog).queryByRole('radio', { name: /Enterprise/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Basic/ }));
    fireEvent.change(within(dialog).getByLabelText(form.notes), {
      target: { value: 'Reduzir custos no próximo semestre.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.submit }));

    expect(await screen.findByText(plan.sent)).toBeInTheDocument();
    const updated = await region(plan.title);
    const pending = within(updated).getByRole('group', {
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

  it('exige a escolha do plano e limita a observação', async () => {
    renderSettings();
    const section = await region(plan.title);
    fireEvent.click(
      within(section).getByRole('button', { name: plan.request }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });

    fireEvent.change(within(dialog).getByLabelText(form.notes), {
      target: { value: 'x'.repeat(501) },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.submit }));

    expect(
      await within(dialog).findByText(form.choosePlan),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(form.notesTooLong)).toBeInTheDocument();
  });

  it('cancela a solicitação em análise, com confirmação', async () => {
    renderSettings();
    const section = await region(plan.title);
    fireEvent.click(
      within(section).getByRole('button', { name: plan.request }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });
    fireEvent.click(within(dialog).getByRole('radio', { name: /Basic/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: form.submit }));
    fireEvent.click(await screen.findByRole('button', { name: plan.cancel }));

    const confirm = await screen.findByRole('dialog', {
      name: plan.cancelTitle,
    });
    fireEvent.click(within(confirm).getByRole('button', { name: plan.cancel }));

    expect(await screen.findByText(plan.cancelled)).toBeInTheDocument();
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
    changeTerm(organization.id, { endsAt: '2026-11-10T03:00:00.000Z' });
    renderSettings();
    const section = await region(plan.title);

    fireEvent.click(
      within(section).getByRole('button', { name: plan.request }),
    );

    const dialog = await screen.findByRole('dialog', { name: form.title });
    expect(
      await within(dialog).findByRole('radio', { name: /Enterprise/ }),
    ).toHaveAccessibleDescription(form.current);
  });
});

describe('administrador da plataforma', () => {
  it('vê e edita só a organização da plataforma, sem plano', async () => {
    renderSettings({ profile: 'platform_admin' });

    const section = await region(organizationSection.title);
    expect(
      valueOf(section, organizationSection.fields.tradeName),
    ).toHaveTextContent('VitaCare');
    expect(
      valueOf(section, organizationSection.fields.legalName),
    ).toHaveTextContent(content.none);
    expect(
      within(section).getByRole('button', { name: organizationSection.edit }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: plan.title }),
    ).not.toBeInTheDocument();
  });
});

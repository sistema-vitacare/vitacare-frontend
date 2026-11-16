import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  organizationFieldErrors,
  organizationFieldLabels as labels,
} from '../../../src/data/organizationFields.js';
import {
  newOrganizationFieldErrors,
  organizationCreatedContent as created,
  organizationNewContent as content,
} from '../../../src/data/organizationPages.js';
import { temporaryPasswordContent as passwordField } from '../../../src/data/temporaryPassword.js';
import { userFieldErrors } from '../../../src/data/userPages.js';
import OrganizationNewPage from '../../../src/pages/Organizations/OrganizationNewPage.jsx';
import {
  failNextRequest,
  resetMockState,
} from '../../../src/services/mockApi.js';
import { allClientOrganizations } from '../../../src/services/organizationStore.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');

function renderNew() {
  return renderPage(
    [
      { path: PATHS.ORGANIZATIONS, element: <p>Lista</p> },
      { path: PATHS.ORGANIZATION_NEW, element: <OrganizationNewPage /> },
      {
        path: PATHS.ORGANIZATION_DETAIL,
        element: <p>Página da organização</p>,
      },
    ],
    { profile: 'platform_admin', path: PATHS.ORGANIZATION_NEW },
  );
}

const region = (name) => screen.getByRole('region', { name });

function type(container, label, value) {
  fireEvent.change(within(container).getByLabelText(label, { exact: false }), {
    target: { value },
  });
}

// O plano só abre depois que o catálogo chega; até lá, fica desabilitado.
async function openPlans() {
  const select = await screen.findByRole('combobox', {
    name: new RegExp(content.plan),
  });
  await waitFor(() =>
    expect(select).not.toHaveAttribute('aria-disabled', 'true'),
  );
  fireEvent.mouseDown(select);
}

async function choosePlan(name) {
  await openPlans();
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(name) }),
  );
}

async function fillValid({ code = 'casa-aurora', document = '' } = {}) {
  const organization = await screen.findByRole('region', {
    name: content.sections.organization,
  });
  type(organization, labels.code, code);
  type(organization, labels.tradeName, 'Casa de Repouso Aurora');
  type(organization, labels.document, document);
  await choosePlan('Basic');
  const administrator = region(content.sections.administrator);
  type(administrator, content.administrator.name, 'Marta Ribeiro');
  type(administrator, content.administrator.email, 'marta@aurora.example');
  type(administrator, content.administrator.cpf, '52998224725');
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: content.save }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
});

describe('cadastro de organização', () => {
  it('oferece os planos do catálogo com os limites de cada um', async () => {
    renderNew();

    await openPlans();

    expect(
      await screen.findByRole('option', { name: /Basic/ }),
    ).toHaveTextContent(content.planOption('10', '200'));
    expect(
      screen.getByRole('option', { name: /Enterprise/ }),
    ).toHaveTextContent(content.planOption('50', '1.000'));
  });

  it('aponta os campos antes do envio, inclusive os do administrador', async () => {
    renderNew();
    await screen.findByRole('region', { name: content.sections.organization });
    // Se a tela chamasse a API, a falha apareceria no lugar dos campos.
    failNextRequest();

    submit();

    expect(await screen.findByText(content.invalidFields)).toBeInTheDocument();
    expect(
      screen.getByText(newOrganizationFieldErrors.code.MIN_LENGTH),
    ).toBeInTheDocument();
    expect(
      screen.getByText(organizationFieldErrors.tradeName.MIN_LENGTH),
    ).toBeInTheDocument();
    expect(
      screen.getByText(newOrganizationFieldErrors.usagePlanId.IS_UUID),
    ).toBeInTheDocument();
    const administrator = region(content.sections.administrator);
    expect(
      within(administrator).getByText(userFieldErrors.name.MIN_LENGTH),
    ).toBeInTheDocument();
    expect(
      within(administrator).getByText(userFieldErrors.email.IS_EMAIL),
    ).toBeInTheDocument();
    expect(
      within(administrator).getByText(userFieldErrors.cpf.IS_CPF),
    ).toBeInTheDocument();
  });

  it('código e documento repetidos voltam no campo', async () => {
    renderNew();
    await fillValid({ code: 'bem-viver' });

    submit();

    expect(
      await screen.findByText(newOrganizationFieldErrors.code.DUPLICATE),
    ).toBeInTheDocument();

    type(region(content.sections.organization), labels.code, 'casa-aurora');
    type(
      region(content.sections.organization),
      labels.document,
      '58.214.903/0001-07',
    );
    submit();

    expect(
      await screen.findByText(organizationFieldErrors.document.DUPLICATE),
    ).toBeInTheDocument();
  });

  it('cadastra, mostra a senha uma única vez com o código do login e abre a organização', async () => {
    const router = renderNew();
    await fillValid();

    submit();

    const dialog = await screen.findByRole('dialog', { name: created.title });
    expect(
      within(dialog).getByText(
        created.intro('Marta Ribeiro', 'Casa de Repouso Aurora'),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(passwordField.label).value,
    ).toHaveLength(20);
    expect(
      within(dialog).getByText(created.loginCode('casa-aurora')),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(created.validUntil)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: created.open }));

    expect(
      await screen.findByText('Página da organização'),
    ).toBeInTheDocument();
    const saved = allClientOrganizations().find(
      (item) => item.code === 'casa-aurora',
    );
    expect(router.state.location.pathname).toBe(organizationPath(saved.id));
  });

  it('Cancelar volta para a lista', async () => {
    renderNew();

    fireEvent.click(await screen.findByRole('link', { name: content.cancel }));

    expect(await screen.findByText('Lista')).toBeInTheDocument();
  });
});

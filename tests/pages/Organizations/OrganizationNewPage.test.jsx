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
import { apiFailure, apiStub, reply } from '../../support/apiStub.js';
import {
  BASIC,
  PLANS,
  apiOrganization,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const CREATE = 'POST /organizations';
const PASSWORD = 'X7hK2mPq9RtV4wYz8NcB';
const AURORA = apiOrganization({
  id: '2b3c4d5e-6f70-4a81-9c02-b3c4d5e6f708',
  code: 'casa-aurora',
  tradeName: 'Casa de Repouso Aurora',
  createdAt: NOW.toISOString(),
});

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
  apiStub().use({ 'GET /plans': () => ({ data: PLANS, meta: {} }) });
});

afterEach(() => {
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

    submit();

    expect(await screen.findByText(content.invalidFields)).toBeInTheDocument();
    expect(apiStub().last(CREATE)).toBeUndefined();
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

  it('código e documento repetidos que a API recusa voltam no campo', async () => {
    apiStub().use({
      [CREATE]: ({ body }) =>
        body.code === 'clinica-sol-nascente'
          ? apiFailure(
              409,
              'ORGANIZATION_CODE_TAKEN',
              'Já existe uma organização com este código.',
              [{ field: 'code', code: 'DUPLICATE' }],
            )
          : apiFailure(
              409,
              'ORGANIZATION_DOCUMENT_TAKEN',
              'Já existe uma organização com este documento.',
              [{ field: 'document', code: 'DUPLICATE' }],
            ),
    });
    renderNew();
    await fillValid({ code: 'clinica-sol-nascente' });

    submit();

    expect(
      await screen.findByText(newOrganizationFieldErrors.code.DUPLICATE),
    ).toBeInTheDocument();

    type(region(content.sections.organization), labels.code, 'casa-aurora');
    type(
      region(content.sections.organization),
      labels.document,
      '11.222.333/0001-81',
    );
    submit();

    expect(
      await screen.findByText(organizationFieldErrors.document.DUPLICATE),
    ).toBeInTheDocument();
  });

  it('cadastra, mostra a senha da API uma única vez com o código do login e abre a organização', async () => {
    apiStub().use({
      [CREATE]: () =>
        reply(201, {
          data: {
            organization: AURORA,
            administrator: {
              id: '8f14e45f-ceea-4b7a-9f0b-1c2d3e4f5a6b',
              name: 'Marta Ribeiro',
              email: 'marta@aurora.example',
            },
            temporaryPassword: PASSWORD,
          },
          meta: {},
        }),
    });
    const router = renderNew();
    await fillValid();

    submit();

    const dialog = await screen.findByRole('dialog', { name: created.title });
    expect(
      within(dialog).getByText(
        created.intro('Marta Ribeiro', 'Casa de Repouso Aurora'),
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(passwordField.label).value).toBe(
      PASSWORD,
    );
    expect(apiStub().last(CREATE).body).toEqual({
      code: 'casa-aurora',
      tradeName: 'Casa de Repouso Aurora',
      usagePlanId: BASIC.id,
      administrator: {
        name: 'Marta Ribeiro',
        email: 'marta@aurora.example',
        cpf: '529.982.247-25',
      },
    });
    expect(
      within(dialog).getByText(created.loginCode('casa-aurora')),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(created.validUntil)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: created.open }));

    expect(
      await screen.findByText('Página da organização'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(organizationPath(AURORA.id));
  });

  it('Cancelar volta para a lista', async () => {
    renderNew();

    fireEvent.click(await screen.findByRole('link', { name: content.cancel }));

    expect(await screen.findByText('Lista')).toBeInTheDocument();
  });
});

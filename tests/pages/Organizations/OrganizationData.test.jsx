import { fireEvent, screen, within } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceState from '../../../src/components/ResourceState.jsx';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  organizationFieldLabels as labels,
  organizationFormContent as form,
} from '../../../src/data/organizationFields.js';
import {
  organizationDataContent as content,
  organizationStatusLabels,
} from '../../../src/data/organizationPages.js';
import { useResource } from '../../../src/hooks/useResource.js';
import OrganizationData from '../../../src/pages/Organizations/OrganizationData.jsx';
import { getOrganization } from '../../../src/services/platformOrganizationService.js';
import { apiFailure, apiStub } from '../../support/apiStub.js';
import {
  SOL_NASCENTE,
  VIVA_BEM,
} from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const DETAIL = 'GET /organizations/:organizationId';

// A página da organização carrega a organização e recarrega depois de cada
// mudança, como este apoio; o aviso guarda a severidade que veio.
function Harness() {
  const { organizationId } = useParams();
  const load = useCallback(
    () => getOrganization(organizationId),
    [organizationId],
  );
  const resource = useResource(load);
  const [notice, setNotice] = useState(null);
  return (
    <>
      {notice ? (
        <p role="status" data-severity={notice.severity}>
          {notice.text}
        </p>
      ) : null}
      <ResourceState resource={resource}>
        {(organization) => (
          <OrganizationData
            organization={organization}
            onChanged={(text, severity = 'success') => {
              setNotice({ text, severity });
              resource.retry();
            }}
          />
        )}
      </ResourceState>
    </>
  );
}

// A organização que a API devolve agora; as ações do teste a trocam, como o
// banco faria.
let current;

function renderData(organization) {
  current = organization;
  apiStub().use({ [DETAIL]: () => ({ data: current, meta: {} }) });
  return renderPage(
    [{ path: PATHS.ORGANIZATION_DETAIL, element: <Harness /> }],
    { profile: 'platform_admin', path: organizationPath(organization.id) },
  );
}

const section = () => screen.findByRole('region', { name: content.title });

// Valor de um rótulo na lista de definições.
const valueOf = (container, label) =>
  within(container).getByText(label).nextElementSibling;

const loads = () =>
  apiStub().requests.filter((request) => request.key === DETAIL).length;

function changesStatusTo(status) {
  return () => {
    current = { ...current, status };
    return { data: current, meta: {} };
  };
}

async function confirm(action, dialogTitle) {
  fireEvent.click(
    within(await section()).getByRole('button', { name: action }),
  );
  const dialog = await screen.findByRole('dialog', { name: dialogTitle });
  fireEvent.click(within(dialog).getByRole('button', { name: action }));
  return dialog;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('dados da organização', () => {
  it('mostra o código, os dados, a situação e o cadastro que a API devolve', async () => {
    renderData(SOL_NASCENTE);

    const data = await section();
    expect(valueOf(data, labels.code)).toHaveTextContent(SOL_NASCENTE.code);
    expect(valueOf(data, labels.tradeName)).toHaveTextContent(
      SOL_NASCENTE.tradeName,
    );
    expect(valueOf(data, labels.document)).toHaveTextContent(
      SOL_NASCENTE.document,
    );
    expect(valueOf(data, content.fields.status)).toHaveTextContent(
      organizationStatusLabels.active,
    );
  });

  it('edita no diálogo das Configurações, enviando só o que mudou, e mostra o salvo', async () => {
    renderData(SOL_NASCENTE);
    apiStub().use({
      'PATCH /organizations/:organizationId': ({ body }) => {
        current = { ...current, ...body };
        return { data: current, meta: {} };
      },
    });

    fireEvent.click(
      within(await section()).getByRole('button', { name: content.edit }),
    );
    const dialog = await screen.findByRole('dialog', { name: form.title });
    fireEvent.change(within(dialog).getByLabelText(labels.phone), {
      target: { value: '(16) 3911-0000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: form.save }));

    expect(await screen.findByRole('status')).toHaveTextContent(content.saved);
    expect(valueOf(await section(), labels.phone)).toHaveTextContent(
      '(16) 3911-0000',
    );
    expect(
      apiStub().last('PATCH /organizations/:organizationId'),
    ).toMatchObject({
      params: { organizationId: SOL_NASCENTE.id },
      body: { phone: '(16) 3911-0000' },
    });
  });

  it('inativa com confirmação que avisa a perda de acesso, e reativa', async () => {
    renderData(SOL_NASCENTE);
    apiStub().use({
      'POST /organizations/:organizationId/deactivate':
        changesStatusTo('inactive'),
      'POST /organizations/:organizationId/reactivate':
        changesStatusTo('active'),
    });
    fireEvent.click(
      within(await section()).getByRole('button', {
        name: content.deactivate.action,
      }),
    );
    const warning = await screen.findByRole('dialog', {
      name: content.deactivate.title,
    });
    expect(warning).toHaveTextContent(
      content.deactivate.text(SOL_NASCENTE.tradeName),
    );
    fireEvent.click(
      within(warning).getByRole('button', { name: content.deactivate.action }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.deactivate.done,
    );
    expect(valueOf(await section(), content.fields.status)).toHaveTextContent(
      organizationStatusLabels.inactive,
    );

    await confirm(content.reactivate.action, content.reactivate.title);

    expect(await screen.findByRole('status')).toHaveTextContent(
      content.reactivate.done,
    );
    expect(valueOf(await section(), content.fields.status)).toHaveTextContent(
      organizationStatusLabels.active,
    );
  });

  it('a organização inativa ainda pode ser editada, e oferece Reativar', async () => {
    renderData(VIVA_BEM);

    const data = await section();
    expect(
      within(data).getByRole('button', { name: content.edit }),
    ).toBeInTheDocument();
    expect(
      within(data).getByRole('button', { name: content.reactivate.action }),
    ).toBeInTheDocument();
    expect(
      within(data).queryByRole('button', { name: content.deactivate.action }),
    ).not.toBeInTheDocument();
    expect(valueOf(data, labels.legalName)).toHaveTextContent(content.none);
  });

  describe('situação mudada por outra pessoa', () => {
    it('fecha a confirmação, recarrega e avisa com a mensagem da API', async () => {
      const message = 'A organização já está inativa.';
      renderData(SOL_NASCENTE);
      apiStub().use({
        'POST /organizations/:organizationId/deactivate': () => {
          current = { ...current, status: 'inactive' };
          return apiFailure(409, 'ORGANIZATION_ALREADY_INACTIVE', message);
        },
      });
      await section();
      const before = loads();

      await confirm(content.deactivate.action, content.deactivate.title);

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent(message);
      expect(notice).toHaveAttribute('data-severity', 'warning');
      expect(
        screen.queryByRole('dialog', { name: content.deactivate.title }),
      ).not.toBeInTheDocument();
      expect(loads()).toBe(before + 1);
      expect(valueOf(await section(), content.fields.status)).toHaveTextContent(
        organizationStatusLabels.inactive,
      );
    });

    it('outro erro continua na confirmação, sem recarregar', async () => {
      renderData(SOL_NASCENTE);
      apiStub().use({
        'POST /organizations/:organizationId/deactivate': () =>
          apiFailure(
            409,
            'ORGANIZATION_PLATFORM_PROTECTED',
            'A organização da plataforma não pode ser inativada.',
          ),
      });
      await section();
      const before = loads();

      const dialog = await confirm(
        content.deactivate.action,
        content.deactivate.title,
      );

      expect(
        await within(dialog).findByText(
          'A organização da plataforma não pode ser inativada.',
        ),
      ).toBeInTheDocument();
      expect(loads()).toBe(before);
    });
  });
});

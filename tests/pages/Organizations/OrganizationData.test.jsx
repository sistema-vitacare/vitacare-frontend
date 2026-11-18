import { fireEvent, screen, within } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceState from '../../../src/components/ResourceState.jsx';
import { PATHS, organizationPath } from '../../../src/constants/routes.js';
import {
  BEM_VIVER_ID,
  LAR_SAO_FRANCISCO_ID,
} from '../../../src/data/mocks/organizations.js';
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
import { resetMockState } from '../../../src/services/mockApi.js';
import { getOrganization } from '../../../src/services/platformOrganizationService.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-16T15:00:00.000Z');

// A página da organização (FE-28) carrega a organização e recarrega depois
// de cada mudança, como este apoio.
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
      {notice ? <p role="status">{notice}</p> : null}
      <ResourceState resource={resource}>
        {(organization) => (
          <OrganizationData
            organization={organization}
            onChanged={(text) => {
              setNotice(text);
              resource.retry();
            }}
          />
        )}
      </ResourceState>
    </>
  );
}

function renderData(organizationId) {
  return renderPage(
    [{ path: PATHS.ORGANIZATION_DETAIL, element: <Harness /> }],
    { profile: 'platform_admin', path: organizationPath(organizationId) },
  );
}

const section = () => screen.findByRole('region', { name: content.title });

// Valor de um rótulo na lista de definições.
const valueOf = (container, label) =>
  within(container).getByText(label).nextElementSibling;

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
  resetMockState();
  vi.useRealTimers();
});

describe('dados da organização', () => {
  it('mostra o código, os dados, a situação e o cadastro', async () => {
    renderData(BEM_VIVER_ID);

    const data = await section();
    expect(valueOf(data, labels.code)).toHaveTextContent('bem-viver');
    expect(valueOf(data, labels.tradeName)).toHaveTextContent(
      'Clínica Bem Viver',
    );
    expect(valueOf(data, labels.document)).toHaveTextContent(
      '58.214.903/0001-07',
    );
    expect(valueOf(data, content.fields.status)).toHaveTextContent(
      organizationStatusLabels.active,
    );
  });

  it('edita no diálogo das Configurações e mostra o salvo', async () => {
    renderData(BEM_VIVER_ID);

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
  });

  it('inativa com confirmação que avisa a perda de acesso, e reativa', async () => {
    renderData(BEM_VIVER_ID);
    fireEvent.click(
      within(await section()).getByRole('button', {
        name: content.deactivate.action,
      }),
    );
    const warning = await screen.findByRole('dialog', {
      name: content.deactivate.title,
    });
    expect(warning).toHaveTextContent(
      content.deactivate.text('Clínica Bem Viver'),
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
    renderData(LAR_SAO_FRANCISCO_ID);

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
});

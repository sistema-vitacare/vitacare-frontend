import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { careTeamContent as content } from '../../../src/data/careTeam.js';
import CareTeamSection from '../../../src/pages/Patients/CareTeamSection.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { apiFailure, apiPage, apiStub } from '../../support/apiStub.js';
import { apiPatient } from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const CREATE = 'POST /patient-links';
const UPDATE = 'PATCH /patient-links/:linkId';
const REVOKE = 'POST /patient-links/:linkId/revoke';

const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
  profile: 'professional',
  status: 'active',
};
const ROSANGELA = {
  id: 'c1e00000-0000-5000-8000-000000000001',
  name: 'Rosângela Prado',
  profile: 'caregiver',
  status: 'active',
};
const MARCIO = {
  id: 'c1e00000-0000-5000-8000-000000000002',
  name: 'Márcio Tavares',
  profile: 'caregiver',
  status: 'pending',
};
const SONIA = {
  id: 'f4a00000-0000-5000-8000-000000000001',
  name: 'Sônia Albuquerque Moraes',
  profile: 'family',
  status: 'active',
};

// Vínculo como `GET /patient-links` o devolve.
function apiLink(id, role, user, { linkType = null, note = null } = {}) {
  return {
    id,
    patient: { id: DIRCE, name: 'Dirce Albuquerque Moraes', status: 'active' },
    user,
    role,
    linkType,
    note,
    status: 'active',
    createdAt: '2026-11-04T12:30:00.000Z',
    updatedAt: '2026-11-04T12:30:00.000Z',
    revokedAt: null,
  };
}

// A API devolve do vínculo mais novo para o mais antigo; as respostas
// seguem o que cada ação do teste faria na API.
function teamRoutes() {
  let links = [
    apiLink('l3', 'family', SONIA, { linkType: 'Filha' }),
    apiLink('l2', 'caregiver', ROSANGELA, { linkType: 'Cuidadora da casa' }),
    apiLink('l1', 'responsible_professional', RAFAEL),
  ];
  return {
    'GET /patient-links': () => apiPage(links),
    'GET /patient-links/eligible-users': ({ query }) =>
      apiPage(query.role === 'caregiver' ? [MARCIO, ROSANGELA] : [SONIA]),
    [CREATE]: ({ body }) => {
      const created = apiLink('l4', 'caregiver', MARCIO, body);
      links = [created, ...links];
      return { data: created, meta: {} };
    },
    [UPDATE]: ({ params, body }) => {
      links = links.map((item) =>
        item.id === params.linkId ? { ...item, ...body } : item,
      );
      return {
        data: links.find((item) => item.id === params.linkId),
        meta: {},
      };
    },
    [REVOKE]: ({ params }) => {
      links = links.filter((item) => item.id !== params.linkId);
      return { data: { id: params.linkId, status: 'revoked' }, meta: {} };
    },
  };
}

// O marcador ao lado da seção mostra que o login terminou, para que a
// ausência da seção não seja confundida com a tela ainda vazia.
function renderSection(patient, profile = 'professional') {
  apiStub().use(teamRoutes());
  renderPage(
    [
      {
        path: '/p',
        element: (
          <>
            <p>Detalhe carregado</p>
            <CareTeamSection patient={patient} />
          </>
        ),
      },
    ],
    { profile, path: '/p' },
  );
}

function members() {
  return within(screen.getByRole('list', { name: content.title }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

async function openAddDialog() {
  fireEvent.click(await screen.findByRole('button', { name: content.add }));
  return screen.findByRole('dialog', { name: content.dialog.addTitle });
}

async function choose(dialog, label, option) {
  fireEvent.mouseDown(
    within(dialog).getByRole('combobox', { name: new RegExp(label) }),
  );
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(option) }),
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('CareTeamSection', () => {
  it('lista o responsável primeiro, só para leitura, e depois os vínculos de cuidado', async () => {
    renderSection(apiPatient(DIRCE));

    await waitFor(() => expect(members()).toHaveLength(3));
    const [responsible, caregiver, family] = members();
    expect(responsible).toContain('Rafael Moura Brandão');
    expect(responsible).toContain(content.responsibleHint);
    expect(caregiver).toContain('Rosângela Prado');
    expect(caregiver).toContain('Cuidadora da casa');
    expect(family).toContain('Sônia Albuquerque Moraes');
    expect(family).toContain('Filha');
    expect(
      screen.getAllByRole('button', { name: content.revoke }),
    ).toHaveLength(2);
    expect(apiStub().last('GET /patient-links').query).toEqual({
      patientId: DIRCE,
      limit: '100',
    });
  });

  it('vincula um cuidador escolhido entre os elegíveis', async () => {
    renderSection(apiPatient(DIRCE));
    const dialog = await openAddDialog();

    await choose(dialog, content.dialog.role, content.roles.caregiver);
    await choose(dialog, content.dialog.user, 'Márcio Tavares');
    fireEvent.change(within(dialog).getByLabelText(content.dialog.linkType), {
      target: { value: 'Cuidador noturno' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: content.dialog.save }),
    );

    await waitFor(() => expect(members()).toHaveLength(4));
    expect(members().join()).toContain('Cuidador noturno');
    expect(apiStub().last(CREATE).body).toEqual({
      patientId: DIRCE,
      userId: MARCIO.id,
      linkType: 'Cuidador noturno',
      note: null,
    });
  });

  it('avisa quando a pessoa já tem vínculo vigente', async () => {
    renderSection(apiPatient(DIRCE));
    apiStub().use({
      [CREATE]: () =>
        apiFailure(
          409,
          'PATIENT_LINK_ALREADY_EXISTS',
          'O usuário já tem vínculo vigente com o paciente.',
        ),
    });
    const dialog = await openAddDialog();

    await choose(dialog, content.dialog.role, content.roles.caregiver);
    await choose(dialog, content.dialog.user, 'Rosângela Prado');
    fireEvent.click(
      within(dialog).getByRole('button', { name: content.dialog.save }),
    );

    expect(
      await within(dialog).findByText(
        content.errors.PATIENT_LINK_ALREADY_EXISTS,
      ),
    ).toBeInTheDocument();
  });

  it('pede a pessoa antes de salvar', async () => {
    renderSection(apiPatient(DIRCE));
    const dialog = await openAddDialog();

    fireEvent.click(
      within(dialog).getByRole('button', { name: content.dialog.save }),
    );

    expect(
      await within(dialog).findByText(content.dialog.userRequired),
    ).toBeInTheDocument();
    expect(apiStub().last(CREATE)).toBeUndefined();
  });

  it('edita o tipo e a observação do vínculo', async () => {
    renderSection(apiPatient(DIRCE));
    await waitFor(() => expect(members()).toHaveLength(3));

    fireEvent.click(screen.getAllByRole('button', { name: content.edit })[0]);
    const dialog = await screen.findByRole('dialog', {
      name: content.dialog.editTitle,
    });
    fireEvent.change(within(dialog).getByLabelText(content.dialog.linkType), {
      target: { value: 'Cuidadora diarista' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: content.dialog.save }),
    );

    await waitFor(() => expect(members()[1]).toContain('Cuidadora diarista'));
    expect(apiStub().last(UPDATE)).toMatchObject({
      params: { linkId: 'l2' },
      body: { linkType: 'Cuidadora diarista', note: null },
    });
  });

  it('revoga o vínculo depois da confirmação', async () => {
    renderSection(apiPatient(DIRCE));
    await waitFor(() => expect(members()).toHaveLength(3));

    fireEvent.click(screen.getAllByRole('button', { name: content.revoke })[1]);
    const dialog = await screen.findByRole('dialog', {
      name: content.revokeDialog.title,
    });
    expect(
      within(dialog).getByText(
        content.revokeDialog.text('Sônia Albuquerque Moraes'),
      ),
    ).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: content.revokeDialog.confirm,
      }),
    );

    await waitFor(() => expect(members()).toHaveLength(2));
    expect(members().join()).not.toContain('Sônia');
    expect(apiStub().last(REVOKE).params).toEqual({ linkId: 'l3' });
  });

  it('não aceita vínculo novo em paciente inativo', async () => {
    renderSection(apiPatient(ALZIRA_INACTIVE, { status: 'inactive' }));

    expect(
      await screen.findByRole('button', { name: content.add }),
    ).toBeDisabled();
    expect(screen.getByText(content.inactivePatient)).toBeInTheDocument();
  });

  it('não aparece nem pede vínculos a quem não os gerencia', async () => {
    renderSection(apiPatient(DIRCE), 'caregiver');
    await screen.findByText('Detalhe carregado');

    expect(screen.queryByText(content.title)).toBeNull();
    expect(apiStub().last('GET /patient-links')).toBeUndefined();
  });
});

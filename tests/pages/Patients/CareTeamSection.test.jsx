import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { careTeamContent as content } from '../../../src/data/careTeam.js';
import { patients } from '../../../src/data/mocks/patients.js';
import CareTeamSection from '../../../src/pages/Patients/CareTeamSection.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const dirce = patients.find((patient) => patient.name.startsWith('Dirce'));
const alzira = patients.find((patient) => patient.name.startsWith('Alzira'));

// O marcador ao lado da seção mostra que o login terminou, para que a
// ausência da seção não seja confundida com a tela ainda vazia.
function renderSection(patient, profile = 'professional') {
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
  it('lista o responsável, só para leitura, e os vínculos de cuidado', async () => {
    renderSection(dirce);

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
  });

  it('vincula um cuidador escolhido entre os elegíveis', async () => {
    renderSection(dirce);
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
  });

  it('avisa quando a pessoa já tem vínculo vigente', async () => {
    renderSection(dirce);
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
    renderSection(dirce);
    const dialog = await openAddDialog();

    fireEvent.click(
      within(dialog).getByRole('button', { name: content.dialog.save }),
    );

    expect(
      await within(dialog).findByText(content.dialog.userRequired),
    ).toBeInTheDocument();
  });

  it('edita o tipo e a observação do vínculo', async () => {
    renderSection(dirce);
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
  });

  it('revoga o vínculo depois da confirmação', async () => {
    renderSection(dirce);
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
  });

  it('não aceita vínculo novo em paciente inativo', async () => {
    renderSection(alzira);

    expect(
      await screen.findByRole('button', { name: content.add }),
    ).toBeDisabled();
    expect(screen.getByText(content.inactivePatient)).toBeInTheDocument();
  });

  it('não aparece para quem não gerencia vínculos', async () => {
    renderSection(dirce, 'caregiver');
    await screen.findByText('Detalhe carregado');

    expect(screen.queryByText(content.title)).toBeNull();
  });
});

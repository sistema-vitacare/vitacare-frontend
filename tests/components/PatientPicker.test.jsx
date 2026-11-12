import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PatientPicker from '../../src/components/PatientPicker.jsx';
import { PATHS, medicationsPath } from '../../src/constants/routes.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { renderPage } from '../support/renderPage.jsx';
import { resetViewport } from '../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';

const content = {
  patient: 'Paciente',
  patientPlaceholder: 'Busque pelo nome',
  choosePatient: 'Escolha um paciente.',
  noPatients: 'Nenhum paciente ativo encontrado',
  openPatient: 'Abrir o paciente',
};

function renderPicker(profile, path = PATHS.MEDICATIONS) {
  return renderPage(
    [
      {
        path: PATHS.MEDICATIONS,
        element: (
          <PatientPicker content={content}>
            {(patient) => <p>Escolhido: {patient.name}</p>}
          </PatientPicker>
        ),
      },
    ],
    { profile, path },
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('PatientPicker', () => {
  it('pede o paciente, guarda a escolha no endereço e mostra o conteúdo dele', async () => {
    const router = renderPicker('professional');

    expect(await screen.findByText(content.choosePatient)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: content.patient }), {
      target: { value: 'Dirce' },
    });
    fireEvent.click(
      await screen.findByRole('option', { name: 'Dirce Albuquerque Moraes' }),
    );

    expect(
      await screen.findByText('Escolhido: Dirce Albuquerque Moraes'),
    ).toBeInTheDocument();
    expect(
      `${router.state.location.pathname}${router.state.location.search}`,
    ).toBe(medicationsPath(DIRCE));
    expect(
      screen.getByRole('link', { name: content.openPatient }),
    ).toHaveAttribute('href', `/pacientes/${DIRCE}`);
  });

  it('entra direto em quem alcança um paciente só', async () => {
    const router = renderPicker('family');

    expect(
      await screen.findByText('Escolhido: Dirce Albuquerque Moraes'),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?paciente=${DIRCE}`);
  });

  it('busca pelo id o paciente inativo do endereço, que a lista de ativos não traz', async () => {
    renderPicker('professional', medicationsPath(ALZIRA_INACTIVE));

    expect(
      await screen.findByText('Escolhido: Alzira Prates Monteiro'),
    ).toBeInTheDocument();
    // O Autocomplete copia o valor para o texto do campo num efeito, depois
    // do render que já mostra o conteúdo; sem esperar, a conferência falha
    // quando a máquina está lenta.
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: content.patient }),
      ).toHaveValue('Alzira Prates Monteiro'),
    );
  });

  it('pede o paciente quando o do endereço não existe ou está fora do alcance', async () => {
    renderPicker('caregiver', medicationsPath('nao-existe'));

    expect(await screen.findByText(content.choosePatient)).toBeInTheDocument();
    expect(screen.queryByText(/Escolhido:/)).not.toBeInTheDocument();
  });
});

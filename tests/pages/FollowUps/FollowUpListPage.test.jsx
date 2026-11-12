import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, recordsPath } from '../../../src/constants/routes.js';
import { followUpListContent as content } from '../../../src/data/followUpPages.js';
import { followUpRecordsContent as records } from '../../../src/data/followUpRecords.js';
import FollowUpListPage from '../../../src/pages/FollowUps/FollowUpListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';

function renderList(profile, path = PATHS.RECORDS) {
  return renderPage([{ path: PATHS.RECORDS, element: <FollowUpListPage /> }], {
    profile,
    path,
  });
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('FollowUpListPage', () => {
  it('pede o paciente antes de mostrar os registros e guarda a escolha no endereço', async () => {
    const router = renderList('professional');

    expect(await screen.findByText(content.choosePatient)).toBeInTheDocument();
    const input = screen.getByRole('combobox', { name: content.patient });
    fireEvent.change(input, { target: { value: 'Dirce' } });
    fireEvent.click(
      await screen.findByRole('option', { name: 'Dirce Albuquerque Moraes' }),
    );

    expect(await screen.findByText(records.list.count(28))).toBeInTheDocument();
    expect(
      `${router.state.location.pathname}${router.state.location.search}`,
    ).toBe(recordsPath(DIRCE));
  });

  it('entra direto na lista de quem alcança um paciente só', async () => {
    const router = renderList('family');

    expect(await screen.findByText(records.list.count(27))).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?paciente=${DIRCE}`);
  });

  it('abre a lista do paciente que veio no endereço', async () => {
    renderList('professional', recordsPath(OSVALDO));

    expect(await screen.findByText(records.list.count(12))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.openPatient }),
    ).toHaveAttribute('href', `/pacientes/${OSVALDO}`);
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, alertsPath } from '../../../src/constants/routes.js';
import {
  alertListContent as content,
  resolveAlertContent as resolve,
} from '../../../src/data/alertPages.js';
import AlertListPage from '../../../src/pages/Alerts/AlertListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';

function renderList(profile, path = PATHS.ALERTS) {
  return renderPage([{ path: PATHS.ALERTS, element: <AlertListPage /> }], {
    profile,
    path,
  });
}

const tab = (label, count) =>
  screen.findByRole('tab', {
    name: count === undefined ? label : content.tabLabel(label, count),
  });

const items = () =>
  within(screen.getByRole('list', { name: content.listLabel })).getAllByRole(
    'listitem',
  );

function counter(label) {
  return within(screen.getByRole('list', { name: content.countersLabel }))
    .getByText(label)
    .closest('li');
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('AlertListPage', () => {
  it('pede o paciente antes de mostrar os alertas', async () => {
    renderList('professional');

    expect(
      await screen.findByText(content.picker.choosePatient),
    ).toBeInTheDocument();
  });

  it('conta os abertos por severidade e lista os abertos com a origem de cada um', async () => {
    renderList('professional', alertsPath(OSVALDO));

    expect(await tab(content.tabs.open, 5)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(counter('Crítico')).toHaveTextContent('0');
    expect(counter('Atenção')).toHaveTextContent('2');
    expect(counter('Informativo')).toHaveTextContent('3');
    expect(await tab(content.tabs.critical, 0)).toBeVisible();
    await waitFor(() => expect(items()).toHaveLength(5));
    // Os dois de glicemia têm a origem na legenda; os três lembretes têm a
    // origem também no título.
    expect(screen.getAllByText('Valor registrado')).toHaveLength(2);
    expect(screen.getAllByText('Lembrete de medicamento')).toHaveLength(6);
  });

  it('guarda a aba no endereço e filtra pela severidade', async () => {
    const router = renderList('professional', alertsPath(OSVALDO));

    fireEvent.click(await tab(content.tabs.warning, 2));

    expect(router.state.location.search).toBe(
      `?paciente=${OSVALDO}&aba=atencao`,
    );
    await waitFor(() =>
      expect(screen.getAllByText('Glicemia acima de 180')).toHaveLength(2),
    );
    expect(
      screen.queryByText('Lembrete de medicamento'),
    ).not.toBeInTheDocument();
  });

  it('mostra nos resolvidos quem resolveu e quando', async () => {
    renderList('professional', `${alertsPath(OSVALDO)}&aba=resolvidos`);

    expect(
      (await screen.findAllByText(/^Resolvido por Beatriz Okamoto em /)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Resolver/ })).toBeNull();
  });

  it('resolve com confirmação e atualiza contadores e lista', async () => {
    renderList('caregiver', alertsPath(DIRCE));
    expect(await tab(content.tabs.open, 4)).toBeVisible();

    fireEvent.click(
      (await screen.findAllByRole('button', { name: /^Resolver / }))[0],
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(resolve.dialog.text)).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', { name: resolve.dialog.confirm }),
    );

    expect(await screen.findByText(content.resolved)).toBeVisible();
    expect(await tab(content.tabs.open, 3)).toBeVisible();
    expect(counter('Informativo')).toHaveTextContent('3');
  });

  it('mostra os alertas à familiar, sem o botão de resolver', async () => {
    renderList('family');

    expect(await tab(content.tabs.open, 4)).toBeVisible();
    await waitFor(() => expect(items()).toHaveLength(4));
    expect(screen.queryByRole('button', { name: /^Resolver/ })).toBeNull();
  });

  it('mostra a aba vazia com mensagem', async () => {
    renderList('professional', alertsPath(DIRCE));

    fireEvent.click(await tab(content.tabs.critical, 0));

    expect(await screen.findByText(content.empty.critical)).toBeVisible();
  });
});

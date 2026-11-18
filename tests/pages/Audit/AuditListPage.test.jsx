import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, auditEventPath } from '../../../src/constants/routes.js';
import {
  auditListContent as content,
  auditSeverityLabels,
} from '../../../src/data/auditPages.js';
import { BEM_VIVER_ID } from '../../../src/data/mocks/organizations.js';
import { periodFieldsContent } from '../../../src/data/periodFields.js';
import AuditListPage from '../../../src/pages/Audit/AuditListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { formatDateTime } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const EMPTY_MESSAGE =
  'Nenhum evento de auditoria para os filtros selecionados.';

function renderList({ profile = 'admin', path = PATHS.AUDIT, width } = {}) {
  return renderPage(
    [
      { path: PATHS.AUDIT, element: <AuditListPage /> },
      { path: PATHS.AUDIT_EVENT, element: <p>Página do evento</p> },
    ],
    { profile, path, width },
  );
}

const rowOf = (actionLabel) =>
  screen.getByRole('link', { name: actionLabel }).closest('tr');

function choose(label, option) {
  fireEvent.mouseDown(
    screen.getByRole('combobox', { name: new RegExp(label) }),
  );
  fireEvent.click(screen.getByRole('option', { name: option }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

describe('lista de eventos', () => {
  it('mostra data e hora, responsável, perfil no momento, ação, item, IP e gravidade', async () => {
    renderList();

    const row = (
      await screen.findByRole('link', {
        name: 'Alterou perfil de usuário',
      })
    ).closest('tr');
    const cells = within(row).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual([
      formatDateTime('2026-11-12T09:00:00.000Z'),
      'Helena Vasconcelos',
      'Administrador',
      'Alterou perfil de usuário',
      'Patrícia Lemos DuarteUsuário',
      '192.0.2.10',
      auditSeverityLabels.warning,
    ]);
    expect(
      within(row).getByRole('link', { name: 'Alterou perfil de usuário' }),
    ).toHaveAttribute(
      'href',
      auditEventPath('a0d17000-0000-5000-8000-000000000009'),
    );
  });

  it('evento de sistema sai como "Sistema", sem perfil e sem IP', async () => {
    renderList();

    const row = (
      await screen.findByRole('link', { name: 'Gerou alerta' })
    ).closest('tr');
    expect(within(row).getByText(content.system)).toBeInTheDocument();
    expect(within(row).getAllByText(content.none)).toHaveLength(2);
  });

  it('o administrador vê só a própria organização, sem a coluna nem o filtro de organização', async () => {
    renderList();

    expect(await screen.findByText(content.subtitle(22))).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', {
        name: content.columns.organization,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', {
        name: new RegExp(content.organizationLabel),
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Lúcia Andrade Rocha')).not.toBeInTheDocument();
  });

  it('pagina pelo endereço', async () => {
    const router = renderList();
    await screen.findByText(content.range(1, 20, 22));

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

    expect(
      await screen.findByText(content.range(21, 22, 22)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?pagina=2');
  });
});

describe('filtros', () => {
  it('a gravidade vai para o endereço, volta à primeira página e filtra', async () => {
    const router = renderList({ path: `${PATHS.AUDIT}?pagina=2` });
    await screen.findByText(content.range(21, 22, 22));

    choose(content.severityLabel, auditSeverityLabels.warning);

    await screen.findByText(content.range(1, 12, 12));
    expect(router.state.location.search).toBe('?gravidade=warning');
    for (const row of screen.getAllByRole('row').slice(1)) {
      expect(row).toHaveTextContent(auditSeverityLabels.warning);
    }
  });

  it('busca pelo nome de quem fez ou pela ação, e filtra a ação pelo catálogo', async () => {
    const router = renderList();
    await screen.findByText(content.range(1, 20, 22));

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'rosângela' },
    });
    await screen.findByText(content.range(1, 3, 3));

    choose(content.actionLabel, 'Entrou no sistema');
    await waitFor(() =>
      expect(screen.getByText(content.subtitle(0))).toBeInTheDocument(),
    );
    expect(router.state.location.search).toBe(
      '?busca=ros%C3%A2ngela&acao=auth.login_succeeded',
    );
  });

  it('a origem "Sistema" traz só os eventos sem responsável', async () => {
    renderList();
    await screen.findByText(content.range(1, 20, 22));

    choose(content.actorTypeLabel, 'Sistema');

    await screen.findByText(content.range(1, 1, 1));
    expect(rowOf('Gerou alerta')).toBeInTheDocument();
  });

  it('filtro sem resultado mostra a mensagem da API', async () => {
    renderList({ path: `${PATHS.AUDIT}?busca=inexistente` });

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument();
  });

  it('período inválido aponta o campo e não consulta', async () => {
    renderList({ path: `${PATHS.AUDIT}?de=2026-11-10&ate=2026-11-01` });

    expect(
      await screen.findByText(periodFieldsContent.errors.IS_CALENDAR_DATE),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: content.exportCsv }),
    ).not.toBeInTheDocument();
  });

  it('o período vai para o endereço', async () => {
    const router = renderList();
    await screen.findByText(content.range(1, 20, 22));

    fireEvent.change(screen.getByLabelText(periodFieldsContent.from), {
      target: { value: '2026-11-12' },
    });

    await screen.findByText(content.range(1, 10, 10));
    expect(router.state.location.search).toBe('?de=2026-11-12');
  });
});

describe('exportação', () => {
  it('exporta o CSV com os filtros da lista e o nome da API', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:auditoria');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderList({ path: `${PATHS.AUDIT}?gravidade=warning&de=2026-11-01` });
    await screen.findByText(content.range(1, 10, 10));

    fireEvent.click(screen.getByRole('button', { name: content.exportCsv }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(click.mock.contexts[0].download).toBe(
      'auditoria-2026-11-01-a-2026-11-13.csv',
    );
    const csv = await URL.createObjectURL.mock.calls[0][0].text();
    // Cabeçalho mais os 10 eventos da lista filtrada.
    expect(csv.trim().split('\r\n')).toHaveLength(11);
    click.mockRestore();
  });
});

describe('administrador da plataforma', () => {
  it('vê todas as organizações, com a coluna, o filtro e os nomes de outra organização mascarados', async () => {
    const router = renderList({ profile: 'platform_admin' });

    expect(
      await screen.findByText(content.range(1, 20, 27)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: content.columns.organization }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('L**** A****** R****').length).toBeGreaterThan(
      0,
    );

    choose(content.organizationLabel, 'Clínica Bem Viver');

    await screen.findByText(content.range(1, 5, 5));
    expect(router.state.location.search).toBe(`?organizacao=${BEM_VIVER_ID}`);
  });
});

describe('celular', () => {
  it('troca a tabela por cartões, com a ação levando ao evento', async () => {
    renderList({ width: 375 });

    const link = await screen.findByRole('link', {
      name: 'Alterou perfil de usuário',
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(link.closest('li')).toHaveTextContent('Patrícia Lemos Duarte');
    expect(link.closest('li')).toHaveTextContent('192.0.2.10');
  });
});

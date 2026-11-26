import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, auditEventPath } from '../../../src/constants/routes.js';
import {
  auditListContent as content,
  auditSeverityLabels,
} from '../../../src/data/auditPages.js';
import { periodFieldsContent } from '../../../src/data/periodFields.js';
import AuditListPage from '../../../src/pages/Audit/AuditListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { formatDateTime } from '../../../src/utils/format.js';
import {
  apiFailure,
  apiFile,
  apiPage,
  apiStub,
} from '../../support/apiStub.js';
import {
  AUDIT_EVENTS,
  BEM_VIVER,
  auditRoutes,
  eventId,
} from '../../support/fixtures/audit.js';
import { apiOrganization } from '../../support/fixtures/organizations.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const LIST = 'GET /audit-events';
const OWN_EVENTS = AUDIT_EVENTS.filter(
  (event) => event.organization.id !== BEM_VIVER.id,
);
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

function choose(label, option) {
  fireEvent.mouseDown(
    screen.getByRole('combobox', { name: new RegExp(label) }),
  );
  fireEvent.click(screen.getByRole('option', { name: option }));
}

const lastQuery = () => apiStub().last(LIST).query;

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
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    renderList();

    const row = (
      await screen.findByRole('link', { name: 'Alterou perfil de usuário' })
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
    ).toHaveAttribute('href', auditEventPath(eventId(9)));
    expect(lastQuery()).toEqual({ page: '1', limit: '20' });
  });

  it('evento de sistema sai como "Sistema", sem perfil e sem IP', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    renderList();

    const row = (
      await screen.findByRole('link', { name: 'Gerou alerta' })
    ).closest('tr');
    expect(within(row).getByText(content.system)).toBeInTheDocument();
    expect(within(row).getAllByText(content.none)).toHaveLength(2);
  });

  it('o administrador vê só a própria organização, sem a coluna nem o filtro de organização', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS, total: 22 }));
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
  });

  it('pagina pelo endereço', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS, total: 22 }));
    const router = renderList();
    await screen.findByText(content.range(1, 20, 22));

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

    await waitFor(() => expect(lastQuery().page).toBe('2'));
    expect(router.state.location.search).toBe('?pagina=2');
  });
});

describe('filtros', () => {
  it('a gravidade vai para o endereço e para a API, e volta à primeira página', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS, total: 22 }));
    const router = renderList({ path: `${PATHS.AUDIT}?pagina=2` });
    await waitFor(() => expect(lastQuery().page).toBe('2'));

    choose(content.severityLabel, auditSeverityLabels.warning);

    await waitFor(() =>
      expect(lastQuery()).toEqual({
        severity: 'warning',
        page: '1',
        limit: '20',
      }),
    );
    expect(router.state.location.search).toBe('?gravidade=warning');
  });

  it('busca pelo nome de quem fez ou pela ação, e filtra a ação pelo catálogo da API', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    const router = renderList();
    await screen.findByRole('link', { name: 'Alterou perfil de usuário' });

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'rosângela' },
    });
    await waitFor(() => expect(lastQuery().search).toBe('rosângela'));

    choose(content.actionLabel, 'Entrou no sistema');
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        search: 'rosângela',
        action: 'auth.login_succeeded',
      }),
    );
    expect(router.state.location.search).toBe(
      '?busca=ros%C3%A2ngela&acao=auth.login_succeeded',
    );
  });

  it('a origem "Sistema" pede só os eventos sem responsável', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    renderList();
    await screen.findByRole('link', { name: 'Alterou perfil de usuário' });

    choose(content.actorTypeLabel, 'Sistema');

    await waitFor(() => expect(lastQuery().actorType).toBe('system'));
  });

  it('filtro sem resultado mostra a mensagem da API', async () => {
    apiStub().use(auditRoutes({ events: [] }));
    renderList({ path: `${PATHS.AUDIT}?busca=inexistente` });

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument();
    expect(lastQuery().search).toBe('inexistente');
  });

  it('período inválido aponta o campo e não consulta', async () => {
    apiStub().use(auditRoutes());
    renderList({ path: `${PATHS.AUDIT}?de=2026-11-10&ate=2026-11-01` });

    expect(
      await screen.findByText(periodFieldsContent.errors.IS_CALENDAR_DATE),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: content.exportCsv }),
    ).not.toBeInTheDocument();
    expect(apiStub().last(LIST)).toBeUndefined();
  });

  it('o período vai para o endereço e para a API', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    const router = renderList();
    await screen.findByRole('link', { name: 'Alterou perfil de usuário' });

    fireEvent.change(screen.getByLabelText(periodFieldsContent.from), {
      target: { value: '2026-11-12' },
    });

    await waitFor(() => expect(lastQuery().from).toBe('2026-11-12'));
    expect(router.state.location.search).toBe('?de=2026-11-12');
  });
});

describe('exportação', () => {
  it('exporta o CSV com os filtros da lista e o nome que a API dá ao arquivo', async () => {
    apiStub().use({
      ...auditRoutes({ events: OWN_EVENTS }),
      'GET /audit-events/export': () =>
        apiFile('Data/hora;Organização;Usuário\r\n', {
          fileName: 'auditoria-2026-11-01-a-2026-11-13.csv',
          type: 'text/csv; charset=utf-8',
        }),
    });
    URL.createObjectURL = vi.fn(() => 'blob:auditoria');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderList({ path: `${PATHS.AUDIT}?gravidade=warning&de=2026-11-01` });
    await screen.findByRole('link', { name: 'Alterou perfil de usuário' });

    fireEvent.click(screen.getByRole('button', { name: content.exportCsv }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(click.mock.contexts[0].download).toBe(
      'auditoria-2026-11-01-a-2026-11-13.csv',
    );
    expect(apiStub().last('GET /audit-events/export').query).toEqual({
      severity: 'warning',
      from: '2026-11-01',
    });
    click.mockRestore();
  });

  it('no limite da exportação, mostra a mensagem da API', async () => {
    const message =
      'Há eventos demais para exportar de uma vez. Estreite o período ou os filtros.';
    apiStub().use({
      ...auditRoutes({ events: OWN_EVENTS }),
      'GET /audit-events/export': () =>
        apiFile('', { fileName: 'auditoria.csv', type: 'text/csv' }),
    });
    apiStub().fail(
      'GET /audit-events/export',
      apiFailure(422, 'AUDIT_EXPORT_TOO_MANY_EVENTS', message),
    );
    renderList();
    await screen.findByRole('link', { name: 'Alterou perfil de usuário' });

    fireEvent.click(screen.getByRole('button', { name: content.exportCsv }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});

describe('administrador da plataforma', () => {
  it('vê a coluna, o filtro com as organizações da API e os nomes de outra organização como a API os mascara', async () => {
    apiStub().use({
      ...auditRoutes({ total: 27 }),
      'GET /organizations': () =>
        apiPage([
          apiOrganization({
            id: BEM_VIVER.id,
            code: 'bem-viver',
            tradeName: BEM_VIVER.name,
          }),
        ]),
    });
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

    await waitFor(() =>
      expect(apiStub().last('GET /organizations').query).toEqual({
        limit: '100',
      }),
    );
    choose(content.organizationLabel, BEM_VIVER.name);

    await waitFor(() => expect(lastQuery().organizationId).toBe(BEM_VIVER.id));
    expect(router.state.location.search).toBe(`?organizacao=${BEM_VIVER.id}`);
  });
});

describe('celular', () => {
  it('troca a tabela por cartões, com a ação levando ao evento', async () => {
    apiStub().use(auditRoutes({ events: OWN_EVENTS }));
    renderList({ width: 375 });

    const link = await screen.findByRole('link', {
      name: 'Alterou perfil de usuário',
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(link.closest('li')).toHaveTextContent('Patrícia Lemos Duarte');
    expect(link.closest('li')).toHaveTextContent('192.0.2.10');
  });
});

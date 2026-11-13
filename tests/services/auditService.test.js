// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditActions } from '../../src/data/mocks/auditActions.js';
import { auditEventsAsOf } from '../../src/data/mocks/auditEvents.js';
import { organization } from '../../src/data/mocks/organization.js';
import { BEM_VIVER_ID } from '../../src/data/mocks/organizations.js';
import {
  exportAuditEvents,
  getAuditEvent,
  listAuditActions,
  listAuditEvents,
} from '../../src/services/auditService.js';
import { recordExport } from '../../src/services/auditStore.js';
import {
  currentViewer,
  startDemoSession,
} from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const events = auditEventsAsOf(NOW);
const ownEvents = events.filter(
  (event) => event.organization.id === organization.id,
);
const foreign = events.find((event) => event.organization.id === BEM_VIVER_ID);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listAuditEvents', () => {
  it('só administrador e administrador da plataforma consultam', async () => {
    await startDemoSession('professional');

    await expect(listAuditEvents()).rejects.toMatchObject({ status: 403 });
  });

  it('dá ao administrador só a própria organização, sem os valores gravados', async () => {
    await startDemoSession('admin');

    const { data, meta } = await listAuditEvents({ limit: 100 });

    expect(meta.pagination.total).toBe(ownEvents.length);
    expect(
      data.every((event) => event.organization.id === organization.id),
    ).toBe(true);
    expect(data[0]).not.toHaveProperty('afterValues');
    expect(data[0]).not.toHaveProperty('beforeValues');
  });

  it('ignora o filtro de organização do administrador', async () => {
    await startDemoSession('admin');

    const { meta } = await listAuditEvents({ organizationId: BEM_VIVER_ID });

    expect(meta.pagination.total).toBe(ownEvents.length);
  });

  it('dá à plataforma todas as organizações, com nomes de pessoas mascarados', async () => {
    await startDemoSession('platform_admin');

    const all = await listAuditEvents({ limit: 100 });
    const bemViver = await listAuditEvents({
      organizationId: BEM_VIVER_ID,
      limit: 100,
    });

    expect(all.meta.pagination.total).toBe(events.length);
    expect(
      bemViver.data.every((event) => event.organization.id === BEM_VIVER_ID),
    ).toBe(true);
    const userEvent = bemViver.data.find((event) => event.actor.user);
    expect(userEvent.actor.user.name).toMatch(/^\S\*+( \S\*+)*$/);
    const created = bemViver.data.find(
      (event) => event.action === 'patient.created',
    );
    expect(created.entity.label).toBe('H**** N*********');
  });

  it('filtra por ação, gravidade, origem e responsável', async () => {
    await startDemoSession('admin');

    const action = await listAuditEvents({ action: 'user.deactivated' });
    const warning = await listAuditEvents({ severity: 'warning', limit: 100 });
    const system = await listAuditEvents({ actorType: 'system' });
    const helena = await listAuditEvents({
      actorUserId: 'f43fdabb-62fc-569d-aa6b-02800cd5b1cd',
      limit: 100,
    });

    expect(action.data.map((event) => event.action)).toEqual([
      'user.deactivated',
    ]);
    expect(warning.data.every((event) => event.severity === 'warning')).toBe(
      true,
    );
    expect(system.data.every((event) => event.actor.type === 'system')).toBe(
      true,
    );
    expect(
      helena.data.every(
        (event) => event.actor.user?.name === 'Helena Vasconcelos',
      ),
    ).toBe(true);
  });

  it('busca pelo nome do responsável ou pela ação, sem acento e sem caixa', async () => {
    await startDemoSession('admin');

    const byName = await listAuditEvents({ search: 'rosangela', limit: 100 });
    const byAction = await listAuditEvents({ search: 'INATIVOU', limit: 100 });

    expect(byName.data.length).toBeGreaterThan(0);
    expect(
      byName.data.every(
        (event) => event.actor.user?.name === 'Rosângela Prado',
      ),
    ).toBe(true);
    expect(
      byAction.data.every((event) => event.actionLabel.startsWith('Inativou')),
    ).toBe(true);
  });

  it('com filtro sem resultado, devolve lista vazia com a mensagem da API', async () => {
    await startDemoSession('admin');

    const result = await listAuditEvents({
      from: '2025-01-01',
      to: '2025-01-31',
    });

    expect(result.data).toEqual([]);
    expect(result.meta.message).toBe(
      'Nenhum evento de auditoria para os filtros selecionados.',
    );
  });

  it('recusa período inválido com o campo', async () => {
    await startDemoSession('admin');

    await expect(listAuditEvents({ from: '2026-11-11' })).rejects.toMatchObject(
      { status: 422, fields: [{ field: 'from', code: 'AFTER_END' }] },
    );
  });
});

describe('exportações da sessão', () => {
  it('entram na lista com os outros eventos da organização', async () => {
    await startDemoSession('admin');
    recordExport({
      viewer: currentViewer(),
      action: 'management_report.exported',
      entity: { type: 'organization', id: organization.id, label: null },
      afterValues: {
        type: 'alerts',
        format: 'pdf',
        from: '2026-10-12',
        to: '2026-11-10',
        condition: null,
      },
    });

    const { data, meta } = await listAuditEvents({ limit: 100 });

    expect(meta.pagination.total).toBe(ownEvents.length + 1);
    expect(data[0].action).toBe('management_report.exported');
  });

  it('abrem no detalhe, com os valores gravados', async () => {
    await startDemoSession('admin');
    recordExport({
      viewer: currentViewer(),
      action: 'management_report.exported',
      entity: { type: 'organization', id: organization.id, label: null },
      afterValues: {
        type: 'caregiver_activity',
        format: 'pdf',
        from: '2026-10-12',
        to: '2026-11-10',
        condition: 'diab',
      },
    });
    const [created] = (await listAuditEvents()).data;

    const { data } = await getAuditEvent(created.id);

    expect(data.afterValues.condition).toBe('diab');
  });
});

describe('listAuditActions', () => {
  it('devolve o catálogo de ações da API', async () => {
    await startDemoSession('admin');

    const { data } = await listAuditActions();

    // A contagem pertence ao teste dos dados simulados; aqui basta o
    // catálogo inteiro, na ordem do seletor.
    expect(data).toEqual(auditActions);
  });
});

describe('getAuditEvent', () => {
  it('traz os valores gravados e recusa o evento de outra organização ao administrador', async () => {
    await startDemoSession('admin');
    const deactivated = ownEvents.find(
      (event) => event.action === 'user.deactivated',
    );

    const { data } = await getAuditEvent(deactivated.id);

    expect(data.afterValues).toEqual({ fromStatus: 'active' });
    await expect(getAuditEvent(foreign.id)).rejects.toMatchObject({
      status: 404,
      code: 'AUDIT_EVENT_NOT_FOUND',
    });
  });
});

describe('exportAuditEvents', () => {
  it('só com a permissão de exportar, e devolve o CSV com o nome da API', async () => {
    await startDemoSession('admin');

    const { data } = await exportAuditEvents({
      from: '2026-10-12',
      to: '2026-11-10',
    });

    expect(data.fileName).toBe('auditoria-2026-10-12-a-2026-11-10.csv');
    expect(data.blob.type).toBe('text/csv;charset=utf-8');
    const text = await data.blob.text();
    expect(text.split('\r\n')).toHaveLength(ownEvents.length + 2);
  });

  it('não exporta para quem não tem a permissão', async () => {
    await startDemoSession('caregiver');

    await expect(exportAuditEvents()).rejects.toMatchObject({ status: 403 });
  });
});

describe('leitura', () => {
  it('a consulta e a exportação não criam evento novo', async () => {
    await startDemoSession('admin');

    await listAuditEvents().catch(() => null);
    await exportAuditEvents().catch(() => null);

    expect(auditEventsAsOf(NOW)).toEqual(events);
  });
});

// O limite de 10.000 eventos não é alcançado pelos dados simulados: o teste
// troca o módulo dos eventos por um com 10.001 da própria organização.
describe('exportAuditEvents acima do limite', () => {
  afterEach(() => {
    vi.doUnmock('../../src/data/mocks/auditEvents.js');
    vi.resetModules();
  });

  it('recusa com a mensagem da API', async () => {
    vi.resetModules();
    vi.doMock('../../src/data/mocks/auditEvents.js', () => ({
      auditEventsAsOf: () =>
        Array.from({ length: 10001 }, (_, index) => ({
          ...ownEvents[0],
          id: `evento-${index}`,
        })),
    }));
    const auth = await import('../../src/services/authService.js');
    const audit = await import('../../src/services/auditService.js');
    await auth.startDemoSession('admin');

    await expect(audit.exportAuditEvents()).rejects.toMatchObject({
      status: 422,
      code: 'AUDIT_EXPORT_TOO_MANY_EVENTS',
      message:
        'Há eventos demais para exportar de uma vez. Estreite o período ou os filtros.',
    });
  });
});

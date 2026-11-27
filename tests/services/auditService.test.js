import { describe, expect, it } from 'vitest';
import {
  exportAuditEvents,
  getAuditEvent,
  listAuditActions,
  listAuditEvents,
} from '../../src/services/auditService.js';
import { login } from '../../src/services/authService.js';
import { apiFailure, apiFile, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TOKEN = `token-${demoUser('admin').id}`;
const FILTERS = { from: '2026-10-01', severity: 'warning', search: 'helena' };

async function signIn() {
  await login(credentialsFor('admin'));
}

describe('auditService', () => {
  it('lista os eventos pela API, com os filtros e a página na query e o token da sessão', async () => {
    await signIn();
    const events = [{ id: 'e1', action: 'user.created' }];
    apiStub().use({ 'GET /audit-events': () => apiPage(events) });

    const { data, meta } = await listAuditEvents({
      ...FILTERS,
      page: 2,
      limit: 20,
    });

    expect(data).toEqual(events);
    expect(meta.pagination.total).toBe(1);
    expect(apiStub().last('GET /audit-events')).toMatchObject({
      query: { ...FILTERS, page: '2', limit: '20' },
      token: TOKEN,
    });
  });

  it('lê o catálogo de ações e o detalhe, com o id escapado', async () => {
    await signIn();
    const actions = [
      {
        action: 'auth.login_succeeded',
        label: 'Entrou no sistema',
        severity: 'normal',
      },
    ];
    apiStub().use({
      'GET /audit-events/actions': () => ({ data: actions, meta: {} }),
      'GET /audit-events/:eventId': ({ params }) => ({
        data: { id: params.eventId },
        meta: {},
      }),
    });

    const catalog = await listAuditActions();
    const detail = await getAuditEvent('../users/u1');

    expect(catalog.data).toEqual(actions);
    expect(detail.data.id).toBe('../users/u1');
  });

  it('exporta o CSV com os filtros da lista e o nome que a API dá ao arquivo', async () => {
    await signIn();
    apiStub().use({
      'GET /audit-events/export': () =>
        apiFile('Data/hora;Organização\r\n', {
          fileName: 'auditoria-2026-10-01-a-2026-10-31.csv',
          type: 'text/csv; charset=utf-8',
        }),
    });

    const { data } = await exportAuditEvents(FILTERS);

    expect(data.fileName).toBe('auditoria-2026-10-01-a-2026-10-31.csv');
    expect(apiStub().last('GET /audit-events/export').query).toEqual(FILTERS);
  });

  it('repassa o evento que a sessão não alcança como 404 da API', async () => {
    await signIn();
    apiStub().use({
      'GET /audit-events/:eventId': () =>
        apiFailure(
          404,
          'AUDIT_EVENT_NOT_FOUND',
          'Evento de auditoria não encontrado.',
        ),
    });

    await expect(getAuditEvent('e9')).rejects.toMatchObject({
      status: 404,
      code: 'AUDIT_EVENT_NOT_FOUND',
    });
  });
});

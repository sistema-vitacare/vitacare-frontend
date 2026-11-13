// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BEM_VIVER_ID } from '../../src/data/mocks/organizations.js';
import { BASIC_PLAN, ENTERPRISE_PLAN } from '../../src/data/mocks/plans.js';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  cancelChangeRequest,
  createChangeRequest,
  getOwnOrganization,
  getOwnPlan,
  listChangeRequests,
  listPlans,
  updateOwnOrganization,
} from '../../src/services/organizationService.js';
import { changeTerm } from '../../src/services/organizationStore.js';
import { listOrganizations } from '../../src/services/platformOrganizationService.js';

const NOW = new Date('2026-11-12T15:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('organização da sessão', () => {
  it('devolve a organização cliente sem o tipo e a de plataforma com ele', async () => {
    await startDemoSession('admin');
    const tenant = (await getOwnOrganization()).data;
    resetMockState();
    await startDemoSession('platform_admin');
    const platform = (await getOwnOrganization()).data;

    expect(tenant.code).toBe(organization.code);
    expect(tenant).not.toHaveProperty('kind');
    expect(platform).toMatchObject({ code: 'vitacare', kind: 'platform' });
  });

  it('só o administrador e a plataforma consultam', async () => {
    await startDemoSession('professional');

    await expect(getOwnOrganization()).rejects.toMatchObject({ status: 403 });
  });

  it('grava os campos enviados, e o nulo limpa o opcional', async () => {
    await startDemoSession('admin');

    const { data } = await updateOwnOrganization({
      tradeName: '  Ipê Amarelo Centro ',
      legalName: null,
    });

    expect(data).toMatchObject({
      tradeName: 'Ipê Amarelo Centro',
      legalName: null,
    });
    expect((await getOwnOrganization()).data.tradeName).toBe(
      'Ipê Amarelo Centro',
    );
  });

  it('recusa corpo vazio, campo inválido e documento de outra organização', async () => {
    await startDemoSession('admin');

    await expect(updateOwnOrganization({})).rejects.toMatchObject({
      status: 422,
      code: 'ORGANIZATION_NOTHING_TO_UPDATE',
    });
    await expect(
      updateOwnOrganization({ tradeName: null }),
    ).rejects.toMatchObject({ status: 422, fields: [{ field: 'tradeName' }] });
    await expect(
      updateOwnOrganization({ document: '58214903000107' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_DOCUMENT_TAKEN',
    });
  });
});

describe('plano da organização', () => {
  it('mostra plano, limites efetivos, uso e vigência sem aviso', async () => {
    await startDemoSession('admin');

    const result = await getOwnPlan();

    expect(result.data).toMatchObject({
      organizationId: organization.id,
      plan: { code: 'enterprise' },
      term: { endsAt: null, status: 'active', expiryWarning: null },
      limits: { users: 50, patients: 1000 },
      usage: { users: 11, patients: 22 },
      pendingChangeRequest: null,
    });
    expect(result.meta.message).toBeUndefined();
  });

  it('avisa o vencimento próximo com a mensagem da API', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { endsAt: '2026-11-17T02:59:00.000Z' });

    const result = await getOwnPlan();

    expect(result.data.term).toMatchObject({
      status: 'active',
      expiryWarning: 'within_7_days',
    });
    expect(result.meta.message).toMatch(
      /^O plano vence em 16\/11\/2026 às 23:59/,
    );
  });

  it('usa o limite expandido do termo quando existe', async () => {
    await startDemoSession('admin');
    changeTerm(organization.id, { userLimit: 80 });

    expect((await getOwnPlan()).data.limits.users).toBe(80);
  });

  it('só o administrador da organização lê o plano; a plataforma lê o catálogo', async () => {
    await startDemoSession('platform_admin');

    await expect(getOwnPlan()).rejects.toMatchObject({ status: 403 });
    expect((await listPlans()).data.map((plan) => plan.code)).toEqual([
      'basic',
      'enterprise',
    ]);
  });
});

describe('solicitação de mudança de plano', () => {
  it('fica pendente, aparece no plano e só uma por vez', async () => {
    await startDemoSession('admin');

    const { data } = await createChangeRequest({
      requestedPlanId: BASIC_PLAN.id,
      notes: '  Reduzir custos. ',
    });

    expect(data).toMatchObject({
      status: 'pending',
      notes: 'Reduzir custos.',
      currentPlan: { code: 'enterprise' },
      requestedPlan: { code: 'basic' },
    });
    expect((await getOwnPlan()).data.pendingChangeRequest.id).toBe(data.id);
    await expect(
      createChangeRequest({ requestedPlanId: BASIC_PLAN.id }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PLAN_CHANGE_REQUEST_ALREADY_PENDING',
    });
  });

  it('recusa o mesmo plano com vigência em dia e aceita como renovação depois do vencimento', async () => {
    await startDemoSession('admin');

    await expect(
      createChangeRequest({ requestedPlanId: ENTERPRISE_PLAN.id }),
    ).rejects.toMatchObject({ status: 422, code: 'PLAN_CHANGE_SAME_PLAN' });

    changeTerm(organization.id, { endsAt: '2026-11-01T02:59:00.000Z' });

    await expect(
      createChangeRequest({ requestedPlanId: ENTERPRISE_PLAN.id }),
    ).resolves.toBeDefined();
  });

  it('recusa plano inexistente e observação acima de 500 caracteres', async () => {
    await startDemoSession('admin');

    await expect(
      createChangeRequest({ requestedPlanId: 'inexistente' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_NOT_FOUND',
      fields: [{ field: 'requestedPlanId' }],
    });
    await expect(
      createChangeRequest({
        requestedPlanId: BASIC_PLAN.id,
        notes: 'a'.repeat(501),
      }),
    ).rejects.toMatchObject({ status: 422, fields: [{ field: 'notes' }] });
  });

  it('cancela a pendente, que sai do plano e entra na lista como cancelada', async () => {
    await startDemoSession('admin');
    const { data } = await createChangeRequest({
      requestedPlanId: BASIC_PLAN.id,
    });

    await cancelChangeRequest(data.id);

    expect((await getOwnPlan()).data.pendingChangeRequest).toBeNull();
    expect((await listChangeRequests()).data[0]).toMatchObject({
      id: data.id,
      status: 'cancelled',
      decidedByUserId: null,
    });
    await expect(cancelChangeRequest(data.id)).rejects.toMatchObject({
      status: 409,
      code: 'PLAN_CHANGE_REQUEST_NOT_PENDING',
    });
  });
});

// Mensagens iguais às de `organization.errors.ts` e `plan.errors.ts` do
// backend (conferidas em 13/11/2026, commit `ce991aa`).
describe('mensagens de erro', () => {
  it('são as da API', async () => {
    await startDemoSession('admin');
    const messages = {};
    const collect = (promise) =>
      promise.then(
        () => {
          throw new Error('a promessa não falhou');
        },
        (error) => {
          messages[error.code] = error.message;
        },
      );

    await collect(updateOwnOrganization({}));
    await collect(updateOwnOrganization({ document: '58214903000107' }));
    await collect(createChangeRequest({ requestedPlanId: 'inexistente' }));
    await collect(createChangeRequest({ requestedPlanId: ENTERPRISE_PLAN.id }));
    await createChangeRequest({ requestedPlanId: BASIC_PLAN.id });
    await collect(createChangeRequest({ requestedPlanId: BASIC_PLAN.id }));
    await collect(cancelChangeRequest('inexistente'));

    expect(messages).toEqual({
      ORGANIZATION_NOTHING_TO_UPDATE:
        'Informe ao menos um campo para atualizar.',
      ORGANIZATION_DOCUMENT_TAKEN:
        'Já existe uma organização com este documento.',
      PLAN_NOT_FOUND: 'Plano de uso inexistente ou indisponível.',
      PLAN_CHANGE_SAME_PLAN:
        'O plano solicitado é o plano atual. Só é possível pedir o mesmo plano para renovar uma vigência vencida.',
      PLAN_CHANGE_REQUEST_ALREADY_PENDING:
        'Já existe uma solicitação de mudança de plano em análise. Aguarde a decisão ou cancele-a.',
      PLAN_CHANGE_REQUEST_NOT_FOUND:
        'Solicitação de mudança de plano não encontrada.',
    });
  });
});

describe('organizações da plataforma', () => {
  it('lista as organizações clientes só para a plataforma, em ordem de nome', async () => {
    await startDemoSession('platform_admin');

    const { data } = await listOrganizations({ limit: 100 });

    expect(data.map((item) => item.tradeName)).toEqual([
      'Clínica Bem Viver',
      'Lar São Francisco',
      'Residencial Ipê Amarelo',
    ]);
    expect(data.map((item) => item.id)).toContain(BEM_VIVER_ID);
    resetMockState();
    await startDemoSession('admin');
    await expect(listOrganizations()).rejects.toMatchObject({ status: 403 });
  });
});

describe('leitura', () => {
  it('a consulta do plano não cria solicitação', async () => {
    await startDemoSession('admin');

    await getOwnPlan().catch(() => null);

    expect(
      (await listChangeRequests().catch(() => ({ data: [] }))).data ?? [],
    ).toEqual([]);
  });
});

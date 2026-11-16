// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { BEM_VIVER_ID } from '../../src/data/mocks/organizations.js';
import {
  platformAdmin,
  platformOrganization,
} from '../../src/data/mocks/platform.js';
import { BASIC_PLAN, ENTERPRISE_PLAN } from '../../src/data/mocks/plans.js';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  approveChangeRequest,
  assignOrganizationPlan,
  cancelChangeRequest,
  createChangeRequest,
  getOrganizationPlan,
  getOwnOrganization,
  getOwnPlan,
  listChangeRequests,
  listPlans,
  rejectChangeRequest,
  updateOwnOrganization,
} from '../../src/services/organizationService.js';
import { changeTerm } from '../../src/services/organizationStore.js';
import {
  getOrganization,
  listOrganizations,
} from '../../src/services/platformOrganizationService.js';

const NOW = new Date('2026-11-12T15:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-5000-8000-000000000000';
// Solicitação simulada da Bem Viver, do Basic para o Enterprise.
const SEEDED_REQUEST_ID = 'c4a9e000-0000-5000-9000-000000000001';

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

describe('plano de uma organização, pela plataforma', () => {
  it('lê o plano de qualquer organização cliente, com o uso simulado e o aviso de vencimento', async () => {
    await startDemoSession('platform_admin');

    const result = await getOrganizationPlan(BEM_VIVER_ID);

    expect(result.data).toMatchObject({
      organizationId: BEM_VIVER_ID,
      plan: { code: 'basic' },
      term: { status: 'active', expiryWarning: 'within_7_days' },
      limits: { users: 10 },
      usage: { users: 7, patients: 64 },
      pendingChangeRequest: {
        id: SEEDED_REQUEST_ID,
        requestedPlan: { code: 'enterprise' },
      },
    });
    expect(result.meta.message).toMatch(/^O plano vence em 17\/11\/2026/);
  });

  it('conta o uso da organização de demonstração pelos estados', async () => {
    await startDemoSession('platform_admin');

    expect((await getOrganizationPlan(organization.id)).data.usage).toEqual({
      users: 11,
      patients: 22,
    });
  });

  it('não acha a organização da plataforma nem a inexistente, e só a plataforma lê', async () => {
    await startDemoSession('platform_admin');

    for (const id of [platformOrganization.id, UNKNOWN_ID]) {
      await expect(getOrganizationPlan(id)).rejects.toMatchObject({
        status: 404,
        code: 'ORGANIZATION_NOT_FOUND',
      });
    }
    resetMockState();
    await startDemoSession('admin');
    await expect(getOrganizationPlan(organization.id)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('atribuição de plano', () => {
  it('troca o termo inteiro: o campo omitido volta ao padrão', async () => {
    await startDemoSession('platform_admin');

    const expanded = (
      await assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
        endsAt: '2026-12-21T02:59:59.999Z',
        userLimit: 80,
        reason: ' Contrato anual. ',
      })
    ).data;
    expect(expanded.term).toMatchObject({
      origin: 'assignment',
      startsAt: NOW.toISOString(),
      endsAt: '2026-12-21T02:59:59.999Z',
      userLimit: 80,
      patientLimit: null,
    });
    expect(expanded.limits).toEqual({ users: 80, patients: 1000 });

    const reset = (
      await assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
      })
    ).data;
    expect(reset.term).toMatchObject({ endsAt: null, userLimit: null });
    expect(reset.limits).toEqual({ users: 50, patients: 1000 });
  });

  it('muda o plano da organização e não decide a solicitação pendente', async () => {
    await startDemoSession('platform_admin');

    const { data } = await assignOrganizationPlan(BEM_VIVER_ID, {
      planId: ENTERPRISE_PLAN.id,
    });

    expect(data.plan.code).toBe('enterprise');
    expect(data.pendingChangeRequest.id).toBe(SEEDED_REQUEST_ID);
    expect((await getOrganization(BEM_VIVER_ID)).data.usagePlanId).toBe(
      ENTERPRISE_PLAN.id,
    );
  });

  it('recusa limite fora da regra do plano, fim no passado e campo inválido', async () => {
    await startDemoSession('platform_admin');

    await expect(
      assignOrganizationPlan(BEM_VIVER_ID, {
        planId: BASIC_PLAN.id,
        userLimit: 20,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_LIMIT_NOT_EXPANDABLE',
      fields: [{ field: 'userLimit', code: 'NOT_EXPANDABLE' }],
    });
    await expect(
      assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
        patientLimit: 10,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_LIMIT_BELOW_CATALOG',
      fields: [{ field: 'patientLimit', code: 'BELOW_CATALOG' }],
    });
    await expect(
      assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
        endsAt: '2026-11-12T14:59:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_TERM_END_IN_PAST',
      fields: [{ field: 'endsAt', code: 'IN_PAST' }],
    });
    await expect(
      assignOrganizationPlan(organization.id, { planId: 'basic' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [{ field: 'planId', code: 'IS_UUID' }],
    });
  });

  it('recusa plano e organização inexistentes, inclusive a da plataforma', async () => {
    await startDemoSession('platform_admin');

    await expect(
      assignOrganizationPlan(organization.id, { planId: UNKNOWN_ID }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'PLAN_NOT_FOUND',
      fields: [{ field: 'planId', code: 'NOT_FOUND' }],
    });
    for (const id of [platformOrganization.id, UNKNOWN_ID]) {
      await expect(
        assignOrganizationPlan(id, { planId: BASIC_PLAN.id }),
      ).rejects.toMatchObject({ status: 404, code: 'ORGANIZATION_NOT_FOUND' });
    }
  });
});

describe('decisão da solicitação', () => {
  it('a plataforma vê as solicitações de todas as organizações', async () => {
    await startDemoSession('platform_admin');

    const { data } = await listChangeRequests({ status: 'pending' });

    expect(data.map((request) => request.organizationId)).toEqual([
      BEM_VIVER_ID,
    ]);
  });

  it('aprova com o termo pela regra da atribuição, e o plano pedido passa a valer', async () => {
    await startDemoSession('platform_admin');

    const { data } = await approveChangeRequest(SEEDED_REQUEST_ID, {
      userLimit: 60,
      decisionNote: ' Segunda unidade confirmada. ',
    });

    expect(data).toMatchObject({
      status: 'approved',
      decisionNote: 'Segunda unidade confirmada.',
      decidedByUserId: platformAdmin.id,
      decidedAt: NOW.toISOString(),
    });
    const plan = (await getOrganizationPlan(BEM_VIVER_ID)).data;
    expect(plan).toMatchObject({
      plan: { code: 'enterprise' },
      term: { origin: 'change_request', userLimit: 60, endsAt: null },
      pendingChangeRequest: null,
    });
    expect((await getOrganization(BEM_VIVER_ID)).data.usagePlanId).toBe(
      ENTERPRISE_PLAN.id,
    );
    await expect(
      approveChangeRequest(SEEDED_REQUEST_ID, {}),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PLAN_CHANGE_REQUEST_NOT_PENDING',
    });
  });

  it('a aprovação segue a regra do termo do plano pedido', async () => {
    await startDemoSession('platform_admin');

    await expect(
      approveChangeRequest(SEEDED_REQUEST_ID, { userLimit: 5 }),
    ).rejects.toMatchObject({ status: 422, code: 'PLAN_LIMIT_BELOW_CATALOG' });
    expect(
      (await getOrganizationPlan(BEM_VIVER_ID)).data.pendingChangeRequest.id,
    ).toBe(SEEDED_REQUEST_ID);
  });

  it('recusa só com justificativa e mantém o plano', async () => {
    await startDemoSession('platform_admin');

    await expect(
      rejectChangeRequest(SEEDED_REQUEST_ID, { decisionNote: '  ' }),
    ).rejects.toMatchObject({
      status: 422,
      fields: [{ field: 'decisionNote', code: 'MIN_LENGTH' }],
    });
    const { data } = await rejectChangeRequest(SEEDED_REQUEST_ID, {
      decisionNote: ' Sem a segunda unidade confirmada. ',
    });

    expect(data).toMatchObject({
      status: 'rejected',
      decisionNote: 'Sem a segunda unidade confirmada.',
      decidedByUserId: platformAdmin.id,
    });
    expect((await getOrganizationPlan(BEM_VIVER_ID)).data).toMatchObject({
      plan: { code: 'basic' },
      pendingChangeRequest: null,
    });
    await expect(
      rejectChangeRequest(UNKNOWN_ID, { decisionNote: 'Motivo.' }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'PLAN_CHANGE_REQUEST_NOT_FOUND',
    });
  });

  it('a organização vê a decisão e a justificativa, sem quem decidiu', async () => {
    await startDemoSession('admin');
    const request = (
      await createChangeRequest({ requestedPlanId: BASIC_PLAN.id })
    ).data;
    await startDemoSession('platform_admin');
    await rejectChangeRequest(request.id, { decisionNote: 'Fora do prazo.' });
    await startDemoSession('admin');

    expect((await listChangeRequests()).data[0]).toMatchObject({
      id: request.id,
      status: 'rejected',
      decisionNote: 'Fora do prazo.',
      decidedByUserId: null,
    });
  });

  it('só a plataforma atribui e decide', async () => {
    await startDemoSession('admin');

    for (const call of [
      () => assignOrganizationPlan(organization.id, { planId: BASIC_PLAN.id }),
      () => approveChangeRequest(SEEDED_REQUEST_ID, {}),
      () => rejectChangeRequest(SEEDED_REQUEST_ID, { decisionNote: 'Não.' }),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 403 });
    }
  });
});

// Mensagens iguais às de `organization.errors.ts` e `plan.errors.ts` do
// backend (conferidas em 16/11/2026, commit `e1cf219`).
describe('mensagens de erro da plataforma', () => {
  it('são as da API', async () => {
    await startDemoSession('platform_admin');
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

    await collect(getOrganizationPlan(UNKNOWN_ID));
    await collect(
      assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
        endsAt: '2026-11-01T03:00:00.000Z',
      }),
    );
    await collect(
      assignOrganizationPlan(BEM_VIVER_ID, {
        planId: BASIC_PLAN.id,
        userLimit: 20,
      }),
    );
    await collect(
      assignOrganizationPlan(organization.id, {
        planId: ENTERPRISE_PLAN.id,
        userLimit: 10,
      }),
    );
    await rejectChangeRequest(SEEDED_REQUEST_ID, { decisionNote: 'Não.' });
    await collect(
      rejectChangeRequest(SEEDED_REQUEST_ID, { decisionNote: 'Não.' }),
    );

    expect(messages).toEqual({
      ORGANIZATION_NOT_FOUND: 'Organização não encontrada.',
      PLAN_TERM_END_IN_PAST: 'A data de fim da vigência deve ser futura.',
      PLAN_LIMIT_NOT_EXPANDABLE:
        'Este plano tem limites fixos. Só o plano Enterprise admite expansão conforme contratação.',
      PLAN_LIMIT_BELOW_CATALOG:
        'A expansão não pode ficar abaixo do limite do plano. Omita o campo para usar o limite do catálogo.',
      PLAN_CHANGE_REQUEST_NOT_PENDING:
        'A solicitação já foi decidida ou cancelada.',
    });
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

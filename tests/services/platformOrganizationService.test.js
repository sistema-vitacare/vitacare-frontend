// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BEM_VIVER_ID,
  LAR_SAO_FRANCISCO_ID,
} from '../../src/data/mocks/organizations.js';
import { platformOrganization } from '../../src/data/mocks/platform.js';
import { BASIC_PLAN } from '../../src/data/mocks/plans.js';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { getOrganizationPlan } from '../../src/services/organizationService.js';
import {
  createOrganization,
  deactivateOrganization,
  getOrganization,
  listOrganizations,
  reactivateOrganization,
  updateOrganization,
} from '../../src/services/platformOrganizationService.js';
import { TEMPORARY_PASSWORD_ALPHABET } from '../../src/utils/temporaryPassword.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-5000-8000-000000000000';

const newOrganization = (overrides = {}) => ({
  code: '  Casa-Aurora ',
  tradeName: ' Casa de Repouso Aurora ',
  usagePlanId: BASIC_PLAN.id,
  administrator: {
    name: ' Marta Ribeiro ',
    email: ' MARTA@aurora.example ',
    cpf: '529.982.247-25',
  },
  ...overrides,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await startDemoSession('platform_admin');
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('cadastro', () => {
  it('cadastra a organização com o primeiro administrador e devolve a senha provisória uma única vez', async () => {
    const { data } = await createOrganization(newOrganization());

    expect(data.organization).toMatchObject({
      code: 'casa-aurora',
      kind: 'tenant',
      tradeName: 'Casa de Repouso Aurora',
      legalName: null,
      document: null,
      status: 'active',
      usagePlanId: BASIC_PLAN.id,
      createdAt: NOW.toISOString(),
      deletedAt: null,
    });
    expect(data.administrator).toMatchObject({
      name: 'Marta Ribeiro',
      email: 'marta@aurora.example',
    });
    expect(data.temporaryPassword).toHaveLength(20);
    for (const character of data.temporaryPassword) {
      expect(TEMPORARY_PASSWORD_ALPHABET).toContain(character);
    }
    const found = (await getOrganization(data.organization.id)).data;
    expect(found).toEqual(data.organization);
    expect(
      (await listOrganizations({ search: 'aurora' })).data.map(
        (item) => item.id,
      ),
    ).toEqual([data.organization.id]);
  });

  it('a organização nova nasce com o termo inicial sem vencimento, 1 usuário e 0 pacientes', async () => {
    const { data } = await createOrganization(newOrganization());

    const plan = (await getOrganizationPlan(data.organization.id)).data;

    expect(plan).toMatchObject({
      plan: { code: 'basic' },
      term: { endsAt: null, origin: 'initial', expiryWarning: null },
      usage: { users: 1, patients: 0 },
      pendingChangeRequest: null,
    });
  });

  it('aponta os campos do corpo, inclusive os do administrador', async () => {
    await expect(
      createOrganization(
        newOrganization({
          code: 'ab',
          administrator: { name: '', email: 'marta', cpf: '111' },
        }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: expect.arrayContaining([
        { field: 'code', code: 'MIN_LENGTH' },
        { field: 'administrator.name', code: 'MIN_LENGTH' },
        { field: 'administrator.email', code: 'IS_EMAIL' },
        { field: 'administrator.cpf', code: 'IS_CPF' },
      ]),
    });
  });

  it('recusa plano inexistente e código ou documento de outra organização, inclusive da plataforma', async () => {
    await expect(
      createOrganization(newOrganization({ usagePlanId: UNKNOWN_ID })),
    ).rejects.toMatchObject({
      status: 422,
      code: 'ORGANIZATION_PLAN_NOT_FOUND',
      fields: [{ field: 'usagePlanId', code: 'NOT_FOUND' }],
    });
    for (const code of ['bem-viver', 'VitaCare']) {
      await expect(
        createOrganization(newOrganization({ code })),
      ).rejects.toMatchObject({
        status: 409,
        code: 'ORGANIZATION_CODE_TAKEN',
        fields: [{ field: 'code', code: 'DUPLICATE' }],
      });
    }
    await expect(
      createOrganization(newOrganization({ document: '58214903000107' })),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_DOCUMENT_TAKEN',
      fields: [{ field: 'document', code: 'DUPLICATE' }],
    });
  });
});

describe('consulta e edição', () => {
  it('consulta qualquer organização com o tipo, e não acha a que não existe', async () => {
    expect((await getOrganization(BEM_VIVER_ID)).data).toMatchObject({
      code: 'bem-viver',
      kind: 'tenant',
    });
    expect((await getOrganization(platformOrganization.id)).data).toMatchObject(
      { kind: 'platform' },
    );
    await expect(getOrganization(UNKNOWN_ID)).rejects.toMatchObject({
      status: 404,
      code: 'ORGANIZATION_NOT_FOUND',
    });
  });

  it('edita também a organização inativa', async () => {
    const { data } = await updateOrganization(LAR_SAO_FRANCISCO_ID, {
      phone: ' (16) 3333-0000 ',
    });

    expect(data).toMatchObject({
      phone: '(16) 3333-0000',
      status: 'inactive',
      updatedAt: NOW.toISOString(),
    });
    expect((await getOrganization(LAR_SAO_FRANCISCO_ID)).data.phone).toBe(
      '(16) 3333-0000',
    );
  });

  it('recusa corpo vazio, organização inexistente e documento de outra organização', async () => {
    await expect(updateOrganization(BEM_VIVER_ID, {})).rejects.toMatchObject({
      status: 422,
      code: 'ORGANIZATION_NOTHING_TO_UPDATE',
    });
    await expect(
      updateOrganization(UNKNOWN_ID, { phone: '(16) 3333-0000' }),
    ).rejects.toMatchObject({ status: 404, code: 'ORGANIZATION_NOT_FOUND' });
    await expect(
      updateOrganization(LAR_SAO_FRANCISCO_ID, {
        document: '58.214.903/0001-07',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_DOCUMENT_TAKEN',
    });
  });
});

describe('situação', () => {
  it('inativa e reativa, e recusa a transição repetida', async () => {
    const inactive = (await deactivateOrganization(BEM_VIVER_ID)).data;

    expect(inactive).toMatchObject({
      status: 'inactive',
      deletedAt: NOW.toISOString(),
    });
    await expect(deactivateOrganization(BEM_VIVER_ID)).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_ALREADY_INACTIVE',
    });
    expect((await reactivateOrganization(BEM_VIVER_ID)).data).toMatchObject({
      status: 'active',
      deletedAt: null,
    });
    await expect(reactivateOrganization(BEM_VIVER_ID)).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_ALREADY_ACTIVE',
    });
  });

  it('protege a organização da plataforma e não acha a que não existe', async () => {
    await expect(
      deactivateOrganization(platformOrganization.id),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_PLATFORM_PROTECTED',
    });
    await expect(deactivateOrganization(UNKNOWN_ID)).rejects.toMatchObject({
      status: 404,
    });
    await expect(reactivateOrganization(UNKNOWN_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('alcance', () => {
  it('só a plataforma consulta, cadastra, edita e muda a situação', async () => {
    await startDemoSession('admin');

    for (const call of [
      () => getOrganization(BEM_VIVER_ID),
      () => createOrganization(newOrganization()),
      () => updateOrganization(BEM_VIVER_ID, { phone: '(16) 3333-0000' }),
      () => deactivateOrganization(BEM_VIVER_ID),
      () => reactivateOrganization(LAR_SAO_FRANCISCO_ID),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 403 });
    }
  });
});

// Mensagens iguais às de `organization.errors.ts` do backend (conferidas em
// 16/11/2026, commit `e1cf219`).
describe('mensagens de erro', () => {
  it('são as da API', async () => {
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

    await collect(getOrganization(UNKNOWN_ID));
    await collect(createOrganization(newOrganization({ code: 'bem-viver' })));
    await collect(
      createOrganization(newOrganization({ document: '58214903000107' })),
    );
    await collect(
      createOrganization(newOrganization({ usagePlanId: UNKNOWN_ID })),
    );
    await collect(updateOrganization(BEM_VIVER_ID, {}));
    await collect(deactivateOrganization(LAR_SAO_FRANCISCO_ID));
    await collect(reactivateOrganization(BEM_VIVER_ID));
    await collect(deactivateOrganization(platformOrganization.id));

    expect(messages).toEqual({
      ORGANIZATION_NOT_FOUND: 'Organização não encontrada.',
      ORGANIZATION_CODE_TAKEN: 'Já existe uma organização com este código.',
      ORGANIZATION_DOCUMENT_TAKEN:
        'Já existe uma organização com este documento.',
      ORGANIZATION_PLAN_NOT_FOUND: 'Plano de uso inexistente ou indisponível.',
      ORGANIZATION_NOTHING_TO_UPDATE:
        'Informe ao menos um campo para atualizar.',
      ORGANIZATION_ALREADY_INACTIVE: 'A organização já está inativa.',
      ORGANIZATION_ALREADY_ACTIVE: 'A organização já está ativa.',
      ORGANIZATION_PLATFORM_PROTECTED:
        'A organização da plataforma não pode ser inativada.',
    });
  });
});

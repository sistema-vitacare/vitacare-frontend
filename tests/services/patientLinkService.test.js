// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  LINK_ERROR_CODES as CODES,
  createPatientLink,
  listEligibleUsers,
  listPatientLinks,
  revokePatientLink,
  updatePatientLink,
} from '../../src/services/patientLinkService.js';
import { getPatient } from '../../src/services/patientService.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const MARCIO = '56cde9e6-4f69-5f6b-a0fa-dc414a232ccb';
const BEATRIZ = 'd5a58f5d-395e-5548-a230-de2350de4651';
const SONIA_LINK = '59bdd77f-4b63-584f-809d-7cee07ea2a10';
const ROSANGELA_DIRCE_LINK = '146a4992-9c76-5579-864a-806170e7b2ba';

afterEach(() => {
  resetMockState();
});

describe('listPatientLinks', () => {
  it('lista o responsável, só para leitura, e os vínculos de cuidado vigentes', async () => {
    await startDemoSession('professional');

    const { data } = await listPatientLinks({ patientId: DIRCE });

    expect(
      data.map((link) => [link.role, link.user.name, link.linkType]),
    ).toEqual([
      ['responsible_professional', 'Rafael Moura Brandão', null],
      ['caregiver', 'Rosângela Prado', 'Cuidadora da casa'],
      ['family', 'Sônia Albuquerque Moraes', 'Filha'],
    ]);
    expect(data[1]).toMatchObject({
      patient: {
        id: DIRCE,
        name: 'Dirce Albuquerque Moraes',
        status: 'active',
      },
      user: { profile: 'caregiver', status: 'active' },
      status: 'active',
    });
  });

  it('recusa a cuidadora, que não gerencia vínculos', async () => {
    await startDemoSession('caregiver');

    await expect(listPatientLinks({ patientId: DIRCE })).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('listEligibleUsers', () => {
  it('oferece cuidadores ativos e pendentes, sem e-mail nem documento', async () => {
    await startDemoSession('professional');

    const { data } = await listEligibleUsers({ role: 'caregiver' });

    expect(data.map((user) => user.name)).toEqual([
      'Edna Carvalho Pires',
      'Juliana Bastos',
      'Márcio Tavares',
      'Rosângela Prado',
    ]);
    expect(Object.keys(data[0]).sort()).toEqual([
      'id',
      'name',
      'profile',
      'status',
    ]);
  });

  it('oferece como responsável administradores e profissionais, sem o inativo, filtrando pelo nome', async () => {
    await startDemoSession('professional');

    const all = await listEligibleUsers({ role: 'responsible_professional' });
    const search = await listEligibleUsers({
      role: 'responsible_professional',
      search: 'okamoto',
    });

    expect(all.data.map((user) => user.name)).toEqual([
      'Beatriz Okamoto',
      'Cláudio Esteves Lacerda',
      'Helena Vasconcelos',
      'Rafael Moura Brandão',
    ]);
    expect(search.data.map((user) => user.id)).toEqual([BEATRIZ]);
  });
});

describe('criação, edição e revogação', () => {
  it('vincula um cuidador, que passa a ver o paciente', async () => {
    await startDemoSession('professional');

    const { data } = await createPatientLink({
      patientId: CLEUSA,
      userId: MARCIO,
      linkType: 'Cuidador noturno',
      note: null,
    });
    const links = await listPatientLinks({ patientId: CLEUSA });

    expect(data).toMatchObject({
      role: 'caregiver',
      linkType: 'Cuidador noturno',
      status: 'active',
    });
    expect(links.data.map((link) => link.user.name)).toContain(
      'Márcio Tavares',
    );
  });

  it.each([
    [
      'vínculo vigente repetido',
      { patientId: DIRCE, userId: '828a4d5b-6754-54c6-8b60-63833149e502' },
      409,
      CODES.ALREADY_EXISTS,
    ],
    [
      'usuário de perfil profissional',
      { patientId: DIRCE, userId: BEATRIZ },
      422,
      CODES.INVALID_USER,
    ],
    [
      'paciente inativo',
      { patientId: ALZIRA_INACTIVE, userId: MARCIO },
      409,
      CODES.PATIENT_INACTIVE,
    ],
  ])('recusa %s', async (_, body, status, code) => {
    await startDemoSession('professional');

    await expect(createPatientLink(body)).rejects.toMatchObject({
      status,
      code,
    });
  });

  it('edita o tipo e a observação do vínculo', async () => {
    await startDemoSession('professional');

    const { data } = await updatePatientLink(ROSANGELA_DIRCE_LINK, {
      linkType: 'Cuidadora diarista',
      note: 'Também às quartas à tarde.',
    });

    expect(data).toMatchObject({
      linkType: 'Cuidadora diarista',
      note: 'Também às quartas à tarde.',
    });
  });

  it('não edita nem revoga o vínculo do responsável', async () => {
    await startDemoSession('professional');
    const { data } = await listPatientLinks({ patientId: DIRCE });
    const responsible = data.find(
      (link) => link.role === 'responsible_professional',
    );

    await expect(
      updatePatientLink(responsible.id, { linkType: 'x' }),
    ).rejects.toMatchObject({
      status: 409,
      code: CODES.RESPONSIBLE_READ_ONLY,
    });
    await expect(revokePatientLink(responsible.id)).rejects.toMatchObject({
      code: CODES.RESPONSIBLE_READ_ONLY,
    });
  });

  it('revoga o vínculo, e a familiar perde o acesso na requisição seguinte', async () => {
    await startDemoSession('professional');

    await revokePatientLink(SONIA_LINK);
    await expect(revokePatientLink(SONIA_LINK)).rejects.toMatchObject({
      status: 409,
      code: CODES.REVOKED,
    });
    await startDemoSession('family');

    await expect(getPatient(DIRCE)).rejects.toMatchObject({ status: 404 });
  });
});

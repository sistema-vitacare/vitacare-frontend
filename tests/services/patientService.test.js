// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PASSWORD } from '../../src/data/mocks/credentials.js';
import { login, startDemoSession } from '../../src/services/authService.js';
import { resetMockState } from '../../src/services/mockApi.js';
import {
  PATIENT_ERROR_CODES as CODES,
  createPatient,
  deactivatePatient,
  getPatient,
  getPatientEvolution,
  getPatientOverview,
  listPatients,
  reactivatePatient,
  updatePatient,
} from '../../src/services/patientService.js';
import { buildIndicators } from '../../src/utils/evolution.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const RAFAEL = 'f6b21c50-000b-5e70-878b-b5e7f5f9a410';
const BEATRIZ = 'd5a58f5d-395e-5548-a230-de2350de4651';
const ROSANGELA = '828a4d5b-6754-54c6-8b60-63833149e502';
const GLICEMIA = 'b8c50e7a-6b23-50a0-b493-ade44ab23371';

async function signInAs(profile) {
  await startDemoSession(profile);
}

async function signInWithEmail(email) {
  await login({
    organizationCode: 'ipe-amarelo',
    email,
    password: DEMO_PASSWORD,
  });
}

const newPatient = {
  name: 'Matilde Ferreira Campos',
  birthDate: '1944-02-03',
  responsibleUserId: RAFAEL,
  sex: 'female',
  cpf: '52998224725',
  phone: null,
  email: null,
  address: null,
  mainCondition: 'Hipertensão arterial',
  secondaryConditions: [],
  healthPlan: null,
  notes: null,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listPatients', () => {
  it('mostra ao administrador os ativos em ordem de nome, com CPF mascarado e paginação de 20', async () => {
    await signInAs('admin');

    const { data, meta } = await listPatients();

    expect(meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 22,
      totalPages: 2,
    });
    expect(data).toHaveLength(20);
    expect(data[0].name).toBe('Amélia Guedes Barreto');
    expect(data.every((patient) => patient.status === 'active')).toBe(true);
    expect(data[0].cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    expect(data[0].viewerLink).toBeNull();
  });

  it('lista os inativos pelo filtro de situação', async () => {
    await signInAs('admin');

    const { data } = await listPatients({ status: 'inactive' });

    expect(data.map((patient) => patient.name)).toEqual([
      'Alzira Prates Monteiro',
      'Moacir Pedrosa Vilela',
    ]);
  });

  it('busca pelo nome sem diferenciar maiúsculas e pelos dígitos do CPF', async () => {
    await signInAs('admin');

    const byName = await listPatients({ search: 'DIRCE' });
    const byCpf = await listPatients({ search: '040.646' });

    expect(byName.data.map((patient) => patient.id)).toEqual([DIRCE]);
    expect(byCpf.data.map((patient) => patient.id)).toEqual([DIRCE]);
  });

  it('filtra pela condição principal ou secundária', async () => {
    await signInAs('admin');

    const { data } = await listPatients({ condition: 'renal' });

    expect(data.map((patient) => patient.name)).toEqual([
      'Osvaldo Teixeira Lins',
      'Silvério Nogueira Bastos',
    ]);
  });

  it('mostra à cuidadora só os pacientes vinculados, com o vínculo dela', async () => {
    await signInAs('caregiver');

    const { data } = await listPatients();

    expect(data.map((patient) => patient.name)).toEqual([
      'Benedito Arruda Paiva',
      'Cleusa Marçal Rezende',
      'Dirce Albuquerque Moraes',
      'Osvaldo Teixeira Lins',
    ]);
    expect(data[0].viewerLink).toEqual({
      role: 'caregiver',
      linkType: 'Cuidadora da casa',
    });
  });

  it('mostra à familiar só o recorte, com contato e documentos mascarados e busca só por nome', async () => {
    await signInAs('family');

    const { data } = await listPatients();
    const byCpf = await listPatients({ search: '040.646' });

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: DIRCE,
      cpf: '********',
      phone: '********',
      healthPlan: '********',
      notes: '********',
      mainCondition: 'Hipertensão arterial',
      viewerLink: { role: 'family', linkType: 'Filha' },
    });
    expect(data[0].address.city).toBe('********');
    expect(byCpf.data).toEqual([]);
  });

  it('recusa o administrador da plataforma, que não tem acesso a pacientes', async () => {
    await signInAs('platform_admin');

    await expect(listPatients()).rejects.toMatchObject({ status: 403 });
  });
});

describe('getPatient', () => {
  it('devolve o CPF completo no detalhe', async () => {
    await signInAs('admin');

    const { data } = await getPatient(DIRCE);

    expect(data.cpf).toBe('04064605403');
    expect(data.responsible.name).toBe('Rafael Moura Brandão');
  });

  it.each([
    [
      'paciente fora do alcance da cuidadora',
      'b07a6b59-2a82-5a9f-be9b-c41102749e06',
    ],
    ['paciente inexistente', '00000000-0000-4000-8000-000000000000'],
  ])('responde 404 para %s', async (_, patientId) => {
    await signInAs('caregiver');

    await expect(getPatient(patientId)).rejects.toMatchObject({
      status: 404,
      code: CODES.NOT_FOUND,
    });
  });

  it('não dá acesso por vínculo revogado', async () => {
    await signInWithEmail('juliana.bastos@ipeamarelo.example');

    await expect(getPatient(BENEDITO)).rejects.toMatchObject({ status: 404 });
  });

  it('devolve no detalhe o paciente inativo, com a data da inativação', async () => {
    await signInAs('admin');

    const { data } = await getPatient(ALZIRA_INACTIVE);

    expect(data.status).toBe('inactive');
    expect(data.deletedAt).not.toBeNull();
  });
});

describe('cadastro, edição, inativação e reativação', () => {
  it('cadastra o paciente ativo, com o responsável escolhido, e ele entra na listagem', async () => {
    await signInAs('professional');

    const { data } = await createPatient(newPatient);
    const list = await listPatients({ search: 'Matilde' });

    expect(data).toMatchObject({
      name: 'Matilde Ferreira Campos',
      status: 'active',
      cpf: '52998224725',
      responsible: {
        id: RAFAEL,
        name: 'Rafael Moura Brandão',
        status: 'active',
      },
    });
    expect(data.address.city).toBeNull();
    expect(list.data.map((patient) => patient.id)).toEqual([data.id]);
  });

  // CPF da Alzira, paciente inativa dos dados simulados.
  it('recusa CPF já cadastrado na organização, mesmo de paciente inativo', async () => {
    await signInAs('professional');

    await expect(
      createPatient({ ...newPatient, cpf: '00722169990' }),
    ).rejects.toMatchObject({
      status: 409,
      code: CODES.DUPLICATE_CPF,
      fields: [expect.objectContaining({ field: 'cpf' })],
    });
  });

  it('recusa responsável que não é profissional nem administrador ativo ou pendente', async () => {
    await signInAs('professional');

    await expect(
      createPatient({ ...newPatient, responsibleUserId: ROSANGELA }),
    ).rejects.toMatchObject({ status: 422, code: CODES.INVALID_RESPONSIBLE });
  });

  it('recusa o cadastro pela cuidadora', async () => {
    await signInAs('caregiver');

    await expect(createPatient(newPatient)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('edita os dados e troca o responsável', async () => {
    await signInAs('professional');

    const { data } = await updatePatient(DIRCE, {
      ...newPatient,
      name: 'Dirce Albuquerque Moraes',
      cpf: '04064605403',
      responsibleUserId: BEATRIZ,
      phone: '(16) 99000-1111',
    });

    expect(data.phone).toBe('(16) 99000-1111');
    expect(data.responsible.name).toBe('Beatriz Okamoto');
    expect((await getPatient(DIRCE)).data.phone).toBe('(16) 99000-1111');
  });

  it('recusa editar paciente inativo', async () => {
    await signInAs('professional');

    await expect(
      updatePatient(ALZIRA_INACTIVE, { ...newPatient, cpf: null }),
    ).rejects.toMatchObject({ status: 409, code: CODES.INACTIVE });
  });

  it('inativa preservando o cadastro e reativa depois', async () => {
    await signInAs('professional');

    await deactivatePatient(DIRCE);
    const active = await listPatients({ search: 'Dirce' });
    const inactive = await listPatients({
      status: 'inactive',
      search: 'Dirce',
    });
    const detail = await getPatient(DIRCE);

    expect(active.data).toEqual([]);
    expect(inactive.data).toHaveLength(1);
    expect(detail.data).toMatchObject({
      status: 'inactive',
      name: 'Dirce Albuquerque Moraes',
    });
    await expect(deactivatePatient(DIRCE)).rejects.toMatchObject({
      status: 409,
      code: CODES.ALREADY_INACTIVE,
    });

    await reactivatePatient(DIRCE);

    expect((await getPatient(DIRCE)).data).toMatchObject({
      status: 'active',
      deletedAt: null,
    });
    await expect(reactivatePatient(DIRCE)).rejects.toMatchObject({
      code: CODES.ALREADY_ACTIVE,
    });
  });

  it('volta ao início com resetMockState', async () => {
    await signInAs('professional');
    await createPatient(newPatient);
    await deactivatePatient(DIRCE);

    resetMockState();
    await signInAs('professional');

    expect((await listPatients()).meta.pagination.total).toBe(22);
  });
});

describe('getPatientOverview', () => {
  it('resume os registros válidos, as últimas medições, os medicamentos e os alertas', async () => {
    await signInAs('professional');

    const { data } = await getPatientOverview(DIRCE);

    expect(data.counts.validFollowUps).toBe(27);
    expect(data.lastVisitedAt).toBe('2026-11-09T12:30:00.000Z');
    expect(data.measurements.map((item) => item.name)).toEqual([
      'Glicemia capilar',
      'Dor',
      'Pressão sistólica',
      'Pressão diastólica',
      'Frequência cardíaca',
      'Saturação de oxigênio',
      'Temperatura',
    ]);
    const systolic = data.measurements.find(
      (item) => item.name === 'Pressão sistólica',
    );
    expect(systolic.values.map((item) => item.value)).toEqual([
      126, 130, 127, 133, 129,
    ]);
    expect(data.activeMedications.map((item) => item.name)).toEqual([
      'Ácido acetilsalicílico 100 mg',
      'Hidroclorotiazida 25 mg',
      'Losartana potássica 50 mg',
    ]);
    expect(data.counts.activeMedications).toBe(3);
    // Medicamento no formato da lista, com o próximo horário: 13:00 de
    // Brasília, uma hora depois de agora.
    expect(data.activeMedications[0].nextScheduledAt).toBe(
      '2026-11-10T16:00:00.000Z',
    );
    // Os quatro lembretes das últimas 24 horas e o alerta de pressão, já
    // resolvido.
    expect(data.recentAlerts.map((item) => item.title)).toEqual([
      'Lembrete de medicamento',
      'Lembrete de medicamento',
      'Lembrete de medicamento',
      'Lembrete de medicamento',
      'Pressão sistólica acima de 160',
    ]);
    expect(data.counts.openAlerts).toBe(4);
  });

  it('não conta o valor de registro anulado', async () => {
    await signInAs('professional');

    const { data } = await getPatientOverview(DIRCE);
    const systolic = data.measurements.find(
      (item) => item.name === 'Pressão sistólica',
    );

    expect(systolic.values.map((item) => item.value)).not.toContain(152);
  });

  it('mostra zeros e listas vazias para paciente sem registros', async () => {
    await signInAs('professional');

    const { data } = await getPatientOverview(CLEUSA);

    expect(data).toMatchObject({
      counts: { validFollowUps: 0, openAlerts: 0, activeMedications: 0 },
      lastVisitedAt: null,
      measurements: [],
      activeMedications: [],
      recentAlerts: [],
    });
  });

  it('limita a cinco os alertas recentes e conta os abertos', async () => {
    await signInAs('professional');

    const { data } = await getPatientOverview(OSVALDO);

    expect(data.recentAlerts).toHaveLength(5);
    // Dois alertas de glicemia e três lembretes das últimas 24 horas.
    expect(data.counts.openAlerts).toBe(5);
  });

  it('responde 404 à familiar para paciente sem vínculo', async () => {
    await signInAs('family');

    await expect(getPatientOverview(OSVALDO)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('getPatientEvolution', () => {
  it('monta as séries dos últimos 30 dias, com os indicadores da API', async () => {
    await signInAs('professional');

    const { data } = await getPatientEvolution(DIRCE);
    const glicemia = data.series.find((item) => item.fieldKey === GLICEMIA);

    expect(data.period).toEqual({
      from: '2026-10-12',
      to: '2026-11-10',
      timeZone: 'America/Sao_Paulo',
    });
    expect(data.series).toHaveLength(7);
    expect(glicemia.points).toHaveLength(10);
    expect(
      glicemia.points[0].visitedAt < glicemia.points.at(-1).visitedAt,
    ).toBe(true);
    expect(glicemia.indicators).toEqual(buildIndicators(glicemia.points));
    expect(data.series.find((item) => item.name === 'Dor')).toMatchObject({
      fieldType: 'scale',
      scaleMin: 0,
      scaleMax: 10,
      unit: null,
    });
  });

  it('filtra pelo parâmetro e pelo período informado', async () => {
    await signInAs('professional');

    const { data } = await getPatientEvolution(DIRCE, {
      from: '2026-11-01',
      to: '2026-11-10',
      fieldKey: GLICEMIA,
    });

    expect(data.series).toHaveLength(1);
    expect(data.series[0].points.map((point) => point.value)).toEqual([
      108, 101, 106,
    ]);
  });

  it('devolve séries vazias quando não há medição no período', async () => {
    await signInAs('professional');

    const { data } = await getPatientEvolution(CLEUSA);

    expect(data.series).toEqual([]);
  });

  it('recusa a cuidadora, que não tem permissão de ver a evolução', async () => {
    await signInAs('caregiver');

    await expect(getPatientEvolution(DIRCE)).rejects.toMatchObject({
      status: 403,
    });
  });
});

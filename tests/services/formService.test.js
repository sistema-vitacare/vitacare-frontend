// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDemoSession } from '../../src/services/authService.js';
import {
  createForm,
  deactivateForm,
  discardFormDraft,
  getForm,
  listForms,
  publishForm,
  reactivateForm,
  saveFormDraft,
  updateForm,
} from '../../src/services/formService.js';
import { resetMockState } from '../../src/services/mockApi.js';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const HOME_VISIT = '3c3086ad-9f4d-5f00-9bf4-7b1f33272a20';
const WELL_BEING = 'fc78dd55-dd62-5075-bd49-995af47c3da7';
const TRIAGE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';

const names = (response) => response.data.map((form) => form.name);

// Campo como o cliente reenvia: o do `GET`, sem `id` e `position`.
const asInput = (fields) =>
  fields.map((field) =>
    Object.fromEntries(
      Object.entries(field).filter(
        ([key]) => !['id', 'position'].includes(key),
      ),
    ),
  );

const newForm = {
  name: 'Curativos',
  description: null,
  trackingType: 'Cuidados',
  frequency: { interval: 2, unit: 'days' },
  audience: 'patients',
  patientIds: [DIRCE],
  fields: [
    {
      name: 'Aspecto da ferida',
      fieldType: 'single_choice',
      requirement: 'required',
      section: 'Ferida',
      options: ['Limpa', 'Com secreção'],
    },
    {
      name: 'Dor na troca',
      fieldType: 'scale',
      requirement: 'optional',
      section: 'Ferida',
      scaleMin: 0,
      scaleMax: 10,
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('listForms', () => {
  it('lista para quem configura todos os formulários por nome, com o resumo da versão vigente', async () => {
    await startDemoSession('professional');

    const response = await listForms({});
    const homeVisit = response.data.find((form) => form.id === HOME_VISIT);

    expect(names(response)).toEqual([
      'Acompanhamento diário',
      'Avaliação de bem-estar',
      'Monitoramento respiratório',
      'Sinais vitais',
      'Triagem de urgência',
      'Visita HAS/DM2',
    ]);
    expect(response.meta.pagination.total).toBe(6);
    expect(homeVisit).toMatchObject({
      hasDraft: true,
      currentVersion: { number: 1, fieldCount: 8 },
    });
    expect(homeVisit.currentVersion.fields).toBeUndefined();
    expect(homeVisit.draft).toBeUndefined();
  });

  it('filtra pela situação e por trecho do nome, sem diferenciar maiúsculas', async () => {
    await startDemoSession('admin');

    expect(names(await listForms({ status: 'draft' }))).toEqual([
      'Avaliação de bem-estar',
    ]);
    expect(names(await listForms({ search: 'SINAIS' }))).toEqual([
      'Sinais vitais',
    ]);
  });

  it('dá ao cuidador só os ativos que valem para os pacientes dele, sem rascunho e com a lista recortada', async () => {
    await startDemoSession('caregiver');

    const response = await listForms({});
    const daily = response.data.find(
      (form) => form.name === 'Acompanhamento diário',
    );

    expect(names(response)).toEqual([
      'Acompanhamento diário',
      'Sinais vitais',
      'Visita HAS/DM2',
    ]);
    expect(daily.patientIds).toEqual([DIRCE, OSVALDO]);
    expect(response.data.every((form) => form.hasDraft === false)).toBe(true);
  });

  it('não mostra ao cuidador rascunhos nem desativados, mesmo pedindo pela situação', async () => {
    await startDemoSession('caregiver');

    const drafts = await listForms({ status: 'draft' });

    expect(drafts.data).toEqual([]);
  });

  it('com o paciente, devolve só os formulários ativos que valem para ele', async () => {
    await startDemoSession('caregiver');

    expect(names(await listForms({ patientId: CLEUSA }))).toEqual([
      'Sinais vitais',
    ]);
    expect(names(await listForms({ patientId: DIRCE }))).toEqual([
      'Acompanhamento diário',
      'Sinais vitais',
      'Visita HAS/DM2',
    ]);
  });

  it('exige a permissão de leitura de formulários', async () => {
    await startDemoSession('family');

    await expect(listForms({})).rejects.toMatchObject({ status: 403 });
  });
});

describe('getForm', () => {
  it('devolve a versão vigente com os campos e o rascunho para quem configura', async () => {
    await startDemoSession('professional');

    const { data } = await getForm(HOME_VISIT);

    expect(data.currentVersion.fields).toHaveLength(9);
    expect(data.draft.fields).toHaveLength(10);
  });

  it('esconde o rascunho do cuidador e responde 404 para formulário fora do alcance dele', async () => {
    await startDemoSession('caregiver');

    const { data } = await getForm(HOME_VISIT);

    expect('draft' in data).toBe(false);
    expect(data.hasDraft).toBe(false);
    await expect(getForm(TRIAGE)).rejects.toMatchObject({
      status: 404,
      code: 'FORM_NOT_FOUND',
    });
  });
});

describe('createForm', () => {
  it('cria em rascunho, com chave nova e posição pelo índice em cada campo', async () => {
    await startDemoSession('professional');

    const { data } = await createForm(newForm);

    expect(data).toMatchObject({
      name: 'Curativos',
      status: 'draft',
      currentVersion: null,
      hasDraft: true,
      patientIds: [DIRCE],
    });
    expect(data.draft.fields.map((field) => field.position)).toEqual([0, 1]);
    expect(data.draft.fields.every((field) => field.fieldKey)).toBe(true);
    expect(names(await listForms({ search: 'curativos' }))).toEqual([
      'Curativos',
    ]);
  });

  it('recusa formulário sem campos, campo incoerente e chave enviada na criação', async () => {
    await startDemoSession('professional');

    await expect(createForm({ ...newForm, fields: [] })).rejects.toMatchObject({
      status: 422,
      code: 'FORM_EMPTY',
    });
    await expect(
      createForm({
        ...newForm,
        fields: [{ ...newForm.fields[1], unit: 'pts' }],
      }),
    ).rejects.toMatchObject({
      code: 'FORM_INVALID_FIELDS',
      fields: [{ field: 'fields.0.unit', code: 'NOT_ALLOWED' }],
    });
    await expect(
      createForm({
        ...newForm,
        fields: [
          {
            ...newForm.fields[1],
            fieldKey: '11111111-1111-4111-8111-111111111111',
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'FORM_INVALID_FIELDS',
      fields: [{ field: 'fields.0.fieldKey', code: 'UNKNOWN' }],
    });
  });

  it('recusa paciente inativo na lista do público', async () => {
    await startDemoSession('professional');

    await expect(
      createForm({ ...newForm, patientIds: [ALZIRA_INACTIVE] }),
    ).rejects.toMatchObject({ status: 422, code: 'FORM_INVALID_PATIENTS' });
  });

  it('exige a permissão de criar formulários', async () => {
    await startDemoSession('caregiver');

    await expect(createForm(newForm)).rejects.toMatchObject({ status: 403 });
  });
});

describe('rascunho e publicação', () => {
  it('salva o rascunho mantendo as chaves e recusa chave desconhecida ou tipo trocado', async () => {
    await startDemoSession('professional');
    const { data: current } = await getForm(VITAL_SIGNS);
    const fields = asInput(current.currentVersion.fields);

    const { data } = await saveFormDraft(VITAL_SIGNS, {
      fields: [
        ...fields,
        {
          name: 'Peso',
          fieldType: 'number',
          decimalPlaces: 1,
          unit: 'kg',
          requirement: 'optional',
          section: 'Sinais vitais',
        },
      ],
    });

    expect(data.currentVersion.number).toBe(1);
    expect(
      data.draft.fields.slice(0, 5).map((field) => field.fieldKey),
    ).toEqual(fields.map((field) => field.fieldKey));
    await expect(
      saveFormDraft(VITAL_SIGNS, {
        fields: [
          { ...fields[0], fieldKey: '11111111-1111-4111-8111-111111111111' },
        ],
      }),
    ).rejects.toMatchObject({
      fields: [{ field: 'fields.0.fieldKey', code: 'UNKNOWN' }],
    });
    await expect(
      saveFormDraft(VITAL_SIGNS, {
        fields: [
          {
            ...fields[0],
            fieldType: 'scale',
            decimalPlaces: null,
            unit: null,
            scaleMin: 0,
            scaleMax: 300,
          },
        ],
      }),
    ).rejects.toMatchObject({
      fields: [{ field: 'fields.0.fieldType', code: 'TYPE_LOCKED' }],
    });
  });

  it('publica a primeira versão sem confirmação e a seguinte só com a confirmação do impacto', async () => {
    await startDemoSession('professional');

    const first = await publishForm(WELL_BEING, {});
    await expect(publishForm(HOME_VISIT, {})).rejects.toMatchObject({
      status: 409,
      code: 'FORM_IMPACT_CONFIRMATION_REQUIRED',
    });
    const second = await publishForm(HOME_VISIT, { confirmImpact: true });

    expect(first.data).toMatchObject({
      status: 'active',
      currentVersion: { number: 1 },
      draft: null,
    });
    expect(second.data).toMatchObject({
      currentVersion: { number: 2, fieldCount: 10 },
      hasDraft: false,
      draft: null,
    });
    await expect(
      publishForm(HOME_VISIT, { confirmImpact: true }),
    ).rejects.toMatchObject({ status: 409, code: 'FORM_NO_DRAFT' });
  });

  it('recusa publicar rascunho só com campos desabilitados', async () => {
    await startDemoSession('professional');
    const { data: current } = await getForm(VITAL_SIGNS);
    await saveFormDraft(VITAL_SIGNS, {
      fields: asInput(current.currentVersion.fields).map((field) => ({
        ...field,
        requirement: 'disabled',
      })),
    });

    await expect(
      publishForm(VITAL_SIGNS, { confirmImpact: true }),
    ).rejects.toMatchObject({ status: 422, code: 'FORM_EMPTY' });
  });

  it('descarta só o rascunho de formulário já publicado', async () => {
    await startDemoSession('professional');

    const { data } = await discardFormDraft(HOME_VISIT);

    expect(data).toMatchObject({ hasDraft: false, draft: null });
    await expect(discardFormDraft(WELL_BEING)).rejects.toMatchObject({
      code: 'FORM_NOT_PUBLISHED',
    });
    await expect(discardFormDraft(VITAL_SIGNS)).rejects.toMatchObject({
      code: 'FORM_NO_DRAFT',
    });
  });
});

describe('situação e dados do formulário', () => {
  it('desativa e reativa preservando as versões, e o desativado não recebe rascunho', async () => {
    await startDemoSession('professional');

    const deactivated = await deactivateForm(VITAL_SIGNS);

    expect(deactivated.data).toMatchObject({
      status: 'inactive',
      deactivatedAt: NOW.toISOString(),
      currentVersion: { number: 1 },
    });
    await expect(
      saveFormDraft(VITAL_SIGNS, { fields: newForm.fields }),
    ).rejects.toMatchObject({ status: 409, code: 'FORM_INACTIVE' });
    await expect(deactivateForm(VITAL_SIGNS)).rejects.toMatchObject({
      code: 'FORM_ALREADY_INACTIVE',
    });
    const reactivated = await reactivateForm(VITAL_SIGNS);
    expect(reactivated.data).toMatchObject({
      status: 'active',
      deactivatedAt: null,
    });
    await expect(reactivateForm(VITAL_SIGNS)).rejects.toMatchObject({
      code: 'FORM_ALREADY_ACTIVE',
    });
  });

  it('volta a rascunho o formulário nunca publicado ao ser reativado', async () => {
    await startDemoSession('admin');
    await deactivateForm(WELL_BEING);

    const { data } = await reactivateForm(WELL_BEING);

    expect(data.status).toBe('draft');
  });

  it('altera os dados sem nova versão e recusa corpo sem nada a alterar', async () => {
    await startDemoSession('professional');

    const { data } = await updateForm(VITAL_SIGNS, {
      name: 'Sinais vitais da visita',
      audience: 'patients',
      patientIds: [CLEUSA],
    });

    expect(data).toMatchObject({
      name: 'Sinais vitais da visita',
      audience: 'patients',
      patientIds: [CLEUSA],
      currentVersion: { number: 1 },
    });
    await expect(updateForm(VITAL_SIGNS, {})).rejects.toMatchObject({
      status: 422,
      code: 'FORM_NOTHING_TO_UPDATE',
    });
  });
});

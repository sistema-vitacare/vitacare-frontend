// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  emptyFieldValues,
  emptyFormValues,
  fieldToValues,
  formToValues,
  groupBySection,
  moveWithinSection,
  toFieldInput,
  toFieldPayload,
  toFormDataPayload,
  validateField,
  validateFormData,
} from '../../src/utils/formEditor.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';

const apiField = {
  id: 'campo-1',
  fieldKey: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Temperatura',
  fieldType: 'number',
  requirement: 'optional',
  position: 0,
  section: 'Sinais vitais',
  unit: '°C',
  decimalPlaces: 1,
  scaleMin: null,
  scaleMax: null,
  options: null,
};

describe('dados do formulário', () => {
  it('monta o corpo da API a partir dos valores da tela, com texto vazio como nulo', () => {
    const values = {
      ...emptyFormValues(),
      name: '  Curativos ',
      trackingType: ' ',
      hasFrequency: true,
      interval: '2',
      unit: 'days',
      audience: 'patients',
      patientIds: [DIRCE],
    };

    expect(toFormDataPayload(values)).toEqual({
      name: 'Curativos',
      description: null,
      trackingType: null,
      frequency: { interval: 2, unit: 'days' },
      audience: 'patients',
      patientIds: [DIRCE],
    });
    expect(
      toFormDataPayload({
        ...values,
        hasFrequency: false,
        audience: 'organization',
      }),
    ).toEqual({
      name: 'Curativos',
      description: null,
      trackingType: null,
      frequency: null,
      audience: 'organization',
    });
  });

  it('volta do formulário da API para os valores da tela', () => {
    const values = formToValues({
      name: 'Sinais vitais',
      description: null,
      trackingType: 'Dados clínicos',
      frequency: { interval: 1, unit: 'weeks' },
      audience: 'organization',
      patientIds: [],
    });

    expect(values).toEqual({
      name: 'Sinais vitais',
      description: '',
      trackingType: 'Dados clínicos',
      hasFrequency: true,
      interval: '1',
      unit: 'weeks',
      audience: 'organization',
      patientIds: [],
    });
  });

  it('exige o nome, a frequência de 1 a 365 e ao menos um paciente no público por pacientes', () => {
    expect(
      validateFormData({
        ...emptyFormValues(),
        hasFrequency: true,
        interval: '400',
        audience: 'patients',
      }),
    ).toEqual({
      name: 'required',
      interval: 'invalid',
      patientIds: 'required',
    });
  });

  it('não aponta problema nos dados mínimos: só o nome', () => {
    expect(validateFormData({ ...emptyFormValues(), name: 'A' })).toEqual({});
  });
});

describe('campos', () => {
  it('converte o campo da API para a tela e de volta sem perder nada', () => {
    const values = fieldToValues(apiField);

    expect(values).toMatchObject({
      decimalPlaces: '1',
      unit: '°C',
      options: '',
    });
    expect(toFieldPayload(values)).toEqual({
      fieldKey: apiField.fieldKey,
      name: 'Temperatura',
      fieldType: 'number',
      requirement: 'optional',
      section: 'Sinais vitais',
      unit: '°C',
      decimalPlaces: 1,
      scaleMin: null,
      scaleMax: null,
      options: null,
    });
  });

  it('manda só as propriedades do tipo e as opções uma por linha, sem linhas vazias', () => {
    const values = {
      ...emptyFieldValues(),
      name: 'Apetite',
      fieldType: 'single_choice',
      unit: 'kg',
      options: 'Bom\n\n  Regular \nRuim',
    };

    expect(toFieldPayload(values)).toMatchObject({
      unit: null,
      decimalPlaces: null,
      options: ['Bom', 'Regular', 'Ruim'],
    });
  });

  it('confere o campo com as regras da API e aponta o problema por propriedade', () => {
    const others = [toFieldPayload(fieldToValues(apiField))];

    expect(
      validateField(
        { ...emptyFieldValues(), name: ' temperatura', fieldType: 'boolean' },
        others,
      ),
    ).toEqual({ name: 'duplicate' });
    expect(
      validateField(
        {
          ...emptyFieldValues(),
          name: 'Dor',
          fieldType: 'scale',
          scaleMin: '10',
          scaleMax: '5',
        },
        others,
      ),
    ).toEqual({ scaleMax: 'invalidRange' });
    expect(
      validateField(
        {
          ...emptyFieldValues(),
          name: 'Apetite',
          fieldType: 'single_choice',
          options: 'Bom',
        },
        others,
      ),
    ).toEqual({ options: 'tooFew' });
    expect(validateField({ ...emptyFieldValues(), name: '' }, others)).toEqual({
      name: 'required',
    });
  });

  it('não aponta problema no campo válido', () => {
    expect(
      validateField(
        { ...emptyFieldValues(), name: 'Banho', fieldType: 'boolean' },
        [],
      ),
    ).toEqual({});
  });

  it('tira o identificador da tela antes de enviar', () => {
    expect(
      toFieldInput({
        uid: 'local-1',
        ...toFieldPayload(fieldToValues(apiField)),
      }),
    ).not.toHaveProperty('uid');
  });
});

describe('seções', () => {
  const items = [
    { uid: 'a', section: 'Sinais vitais' },
    { uid: 'b', section: 'Bem-estar' },
    { uid: 'c', section: 'Sinais vitais' },
    { uid: 'd', section: null },
  ];

  it('agrupa pela ordem em que cada seção aparece pela primeira vez', () => {
    expect(
      groupBySection(items).map((group) => [
        group.section,
        group.items.map((item) => item.uid),
      ]),
    ).toEqual([
      ['Sinais vitais', ['a', 'c']],
      ['Bem-estar', ['b']],
      [null, ['d']],
    ]);
  });

  it('move o campo dentro da seção e devolve a lista na ordem das seções', () => {
    expect(moveWithinSection(items, 'c', -1).map((item) => item.uid)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
    expect(moveWithinSection(items, 'a', -1).map((item) => item.uid)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
  });
});

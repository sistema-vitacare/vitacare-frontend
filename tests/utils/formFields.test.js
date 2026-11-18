// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { forms } from '../../src/data/mocks/forms.js';
import {
  checkFieldKeys,
  checkFormFields,
  enabledFieldCount,
  fieldContractErrors,
  formDataErrors,
} from '../../src/utils/formFields.js';

const base = { requirement: 'optional', section: null };
const sixTypes = [
  {
    ...base,
    name: 'Pressão',
    fieldType: 'number',
    unit: 'mmHg',
    decimalPlaces: 0,
  },
  { ...base, name: 'Dor', fieldType: 'scale', scaleMin: 0, scaleMax: 10 },
  { ...base, name: 'Banho', fieldType: 'boolean' },
  { ...base, name: 'Intercorrências', fieldType: 'text' },
  {
    ...base,
    name: 'Apetite',
    fieldType: 'single_choice',
    options: ['Bom', 'Ruim'],
  },
  {
    ...base,
    name: 'Atividades',
    fieldType: 'multiple_choice',
    options: ['Banho', 'Curativo'],
  },
];

describe('checkFormFields', () => {
  it('aceita os seis tipos com as propriedades que cada um exige', () => {
    expect(checkFormFields(sixTypes)).toEqual([]);
    expect(fieldContractErrors(sixTypes)).toEqual([]);
  });

  it('aceita os campos de todas as versões e rascunhos simulados', () => {
    const versions = forms.flatMap((form) => [
      ...form.versions,
      ...(form.draft ? [form.draft] : []),
    ]);
    const errors = versions.flatMap((version) => [
      ...checkFormFields(version.fields),
      // O cliente reenvia o campo do `GET` sem `id` e `position`.
      ...fieldContractErrors(
        version.fields.map((field) =>
          Object.fromEntries(
            Object.entries(field).filter(
              ([key]) => !['id', 'position'].includes(key),
            ),
          ),
        ),
      ),
    ]);

    expect(errors).toEqual([]);
  });

  it('acusa a propriedade que o tipo exige e falta, e a que o tipo proíbe', () => {
    const fields = [
      { ...base, name: 'Peso', fieldType: 'number', decimalPlaces: null },
      {
        ...base,
        name: 'Dor',
        fieldType: 'scale',
        scaleMin: 0,
        scaleMax: 10,
        unit: 'pts',
      },
      { ...base, name: 'Apetite', fieldType: 'single_choice', options: null },
    ];

    expect(checkFormFields(fields)).toEqual([
      { field: 'fields.0.decimalPlaces', code: 'REQUIRED' },
      { field: 'fields.1.unit', code: 'NOT_ALLOWED' },
      { field: 'fields.2.options', code: 'REQUIRED' },
    ]);
  });

  it('acusa a escala com início igual ou maior que o fim', () => {
    const fields = [
      { ...base, name: 'Dor', fieldType: 'scale', scaleMin: 10, scaleMax: 10 },
    ];

    expect(checkFormFields(fields)).toEqual([
      { field: 'fields.0.scaleMax', code: 'INVALID_RANGE' },
    ]);
  });

  it('acusa nome, opção e chave repetidos, sem diferenciar maiúsculas nem espaços, na segunda ocorrência', () => {
    const key = '11111111-1111-4111-8111-111111111111';
    const fields = [
      { ...base, name: 'Humor', fieldType: 'boolean', fieldKey: key },
      { ...base, name: ' humor ', fieldType: 'boolean', fieldKey: key },
      {
        ...base,
        name: 'Apetite',
        fieldType: 'single_choice',
        options: ['Bom', 'bom'],
      },
    ];

    expect(checkFormFields(fields)).toEqual([
      { field: 'fields.1.name', code: 'DUPLICATE' },
      { field: 'fields.1.fieldKey', code: 'DUPLICATE' },
      { field: 'fields.2.options', code: 'DUPLICATE' },
    ]);
  });
});

describe('checkFieldKeys', () => {
  it('acusa chave desconhecida e chave conhecida com outro tipo', () => {
    const known = new Map([['aaaaaaaa-0000-4000-8000-000000000001', 'number']]);
    const fields = [
      {
        ...base,
        name: 'A',
        fieldType: 'number',
        decimalPlaces: 0,
        fieldKey: 'aaaaaaaa-0000-4000-8000-000000000001',
      },
      {
        ...base,
        name: 'B',
        fieldType: 'boolean',
        fieldKey: 'aaaaaaaa-0000-4000-8000-000000000002',
      },
      { ...base, name: 'C', fieldType: 'boolean' },
    ];
    const typeChanged = [{ ...fields[0], fieldType: 'scale' }];

    expect(checkFieldKeys(fields, known)).toEqual([
      { field: 'fields.1.fieldKey', code: 'UNKNOWN' },
    ]);
    expect(checkFieldKeys(typeChanged, known)).toEqual([
      { field: 'fields.0.fieldType', code: 'TYPE_LOCKED' },
    ]);
  });
});

describe('fieldContractErrors', () => {
  it('acusa nome em branco, tipo fora da lista, casas decimais acima de 3 e propriedade desconhecida', () => {
    const fields = [
      { ...base, name: '   ', fieldType: 'boolean' },
      { ...base, name: 'Data', fieldType: 'date' },
      { ...base, name: 'Peso', fieldType: 'number', decimalPlaces: 4 },
      { ...base, name: 'Cor', fieldType: 'text', position: 3 },
    ];

    expect(fieldContractErrors(fields)).toEqual([
      { field: 'fields.0.name', code: 'MIN_LENGTH' },
      { field: 'fields.1.fieldType', code: 'IS_IN' },
      { field: 'fields.2.decimalPlaces', code: 'MAX' },
      { field: 'fields.3.position', code: 'WHITELIST_VALIDATION' },
    ]);
  });

  it('acusa lista com mais de 100 campos e escolha com uma opção só', () => {
    const many = Array.from({ length: 101 }, (_, index) => ({
      ...base,
      name: `Campo ${index}`,
      fieldType: 'boolean',
    }));
    const single = [
      {
        ...base,
        name: 'Apetite',
        fieldType: 'single_choice',
        options: ['Bom'],
      },
    ];

    expect(fieldContractErrors(many)).toEqual([
      { field: 'fields', code: 'ARRAY_MAX_SIZE' },
    ]);
    expect(fieldContractErrors(single)).toEqual([
      { field: 'fields.0.options', code: 'ARRAY_MIN_SIZE' },
    ]);
  });
});

describe('formDataErrors', () => {
  const valid = {
    name: 'Sinais vitais',
    description: null,
    trackingType: null,
    frequency: { interval: 1, unit: 'weeks' },
    audience: 'organization',
  };

  it('aceita os dados completos e coerentes', () => {
    expect(formDataErrors(valid)).toEqual([]);
    expect(
      formDataErrors({
        ...valid,
        audience: 'patients',
        patientIds: ['0b639b83-76d0-570a-9017-7b6263d892cf'],
      }),
    ).toEqual([]);
  });

  it('exige o nome e a lista de pacientes só com o público por pacientes', () => {
    expect(formDataErrors({ ...valid, name: ' ' })).toEqual([
      { field: 'name', code: 'MIN_LENGTH' },
    ]);
    expect(formDataErrors({ ...valid, audience: 'patients' })).toEqual([
      { field: 'audience', code: 'AUDIENCE_MATCHES_PATIENT_IDS' },
    ]);
    expect(
      formDataErrors({
        ...valid,
        patientIds: ['0b639b83-76d0-570a-9017-7b6263d892cf'],
      }),
    ).toEqual([{ field: 'audience', code: 'AUDIENCE_MATCHES_PATIENT_IDS' }]);
  });

  it('confere a frequência de 1 a 365 em horas, dias ou semanas', () => {
    expect(
      formDataErrors({ ...valid, frequency: { interval: 0, unit: 'months' } }),
    ).toEqual([
      { field: 'frequency.interval', code: 'MIN' },
      { field: 'frequency.unit', code: 'IS_IN' },
    ]);
  });

  it('na alteração parcial, só confere o que veio e exige o público junto com a lista', () => {
    expect(formDataErrors({ description: 'Nova' }, { partial: true })).toEqual(
      [],
    );
    expect(
      formDataErrors(
        { patientIds: ['0b639b83-76d0-570a-9017-7b6263d892cf'] },
        { partial: true },
      ),
    ).toEqual([{ field: 'audience', code: 'AUDIENCE_MATCHES_PATIENT_IDS' }]);
  });
});

describe('enabledFieldCount', () => {
  it('conta só os campos que não estão desabilitados', () => {
    const fields = [
      { requirement: 'required' },
      { requirement: 'optional' },
      { requirement: 'disabled' },
    ];

    expect(enabledFieldCount(fields)).toBe(2);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIELD_ERRORS as E } from '../../src/utils/authValidation.js';
import {
  PATIENT_ERRORS as PE,
  emptyPatientValues,
  patientToValues,
  toPatientPayload,
  validatePatient,
} from '../../src/utils/patientValidation.js';

const TODAY = '2026-11-10';

const valid = {
  ...emptyPatientValues(),
  name: 'Dirce Albuquerque Moraes',
  birthDate: '1941-05-17',
  responsibleUserId: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
};

function errorsFor(changes) {
  return validatePatient({ ...valid, ...changes }, TODAY);
}

describe('validatePatient', () => {
  it('aceita só os três obrigatórios preenchidos', () => {
    expect(validatePatient(valid, TODAY)).toEqual({});
  });

  it('exige nome, nascimento e responsável', () => {
    expect(validatePatient(emptyPatientValues(), TODAY)).toEqual({
      name: E.REQUIRED,
      birthDate: E.REQUIRED,
      responsibleUserId: E.REQUIRED,
    });
  });

  it('recusa nome só com espaços e nome acima de 180 caracteres', () => {
    expect(errorsFor({ name: '   ' })).toEqual({ name: E.REQUIRED });
    expect(errorsFor({ name: 'a'.repeat(181) })).toEqual({ name: E.TOO_LONG });
  });

  it.each([
    ['2026-11-11', PE.FUTURE_DATE],
    ['1899-12-31', PE.TOO_OLD],
    ['2026-02-30', E.INVALID],
  ])('recusa o nascimento %s', (birthDate, error) => {
    expect(errorsFor({ birthDate })).toEqual({ birthDate: error });
  });

  it('aceita o nascimento de hoje e o de 1900-01-01', () => {
    expect(errorsFor({ birthDate: TODAY })).toEqual({});
    expect(errorsFor({ birthDate: '1900-01-01' })).toEqual({});
  });

  it('confere o CPF pelos dígitos verificadores, com ou sem pontuação', () => {
    expect(errorsFor({ cpf: '529.982.247-25' })).toEqual({});
    expect(errorsFor({ cpf: '529.982.247-26' })).toEqual({ cpf: E.INVALID });
    expect(errorsFor({ cpf: '529.982' })).toEqual({ cpf: E.INVALID });
  });

  it('confere telefone, e-mail e CEP quando informados', () => {
    expect(
      errorsFor({
        phone: '(16) 99787-3407',
        email: 'a@b.example',
        zipCode: '14091-256',
      }),
    ).toEqual({});
    expect(
      errorsFor({ phone: '16 abc', email: 'sem-arroba', zipCode: '1409' }),
    ).toEqual({ phone: E.INVALID, email: E.INVALID, zipCode: E.INVALID });
  });

  it('aceita só uma das 27 UFs, sem diferenciar maiúsculas', () => {
    expect(errorsFor({ state: 'sp' })).toEqual({});
    expect(errorsFor({ state: 'XX' })).toEqual({ state: E.INVALID });
  });

  it('limita as condições secundárias a 20 itens de até 180 caracteres', () => {
    expect(
      errorsFor({
        secondaryConditions: Array.from({ length: 21 }, (_, i) => `C${i}`),
      }),
    ).toEqual({ secondaryConditions: PE.TOO_MANY });
    expect(errorsFor({ secondaryConditions: ['a'.repeat(181)] })).toEqual({
      secondaryConditions: E.TOO_LONG,
    });
  });

  it('limita observações a 2000 caracteres e número a 20', () => {
    expect(
      errorsFor({ notes: 'a'.repeat(2001), number: '1'.repeat(21) }),
    ).toEqual({ notes: E.TOO_LONG, number: E.TOO_LONG });
  });
});

describe('toPatientPayload', () => {
  it('envia texto vazio como null, porque a API recusa ""', () => {
    const payload = toPatientPayload(valid);

    expect(payload).toMatchObject({
      name: 'Dirce Albuquerque Moraes',
      birthDate: '1941-05-17',
      responsibleUserId: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
      sex: null,
      cpf: null,
      phone: null,
      email: null,
      mainCondition: null,
      secondaryConditions: [],
      healthPlan: null,
      notes: null,
    });
    expect(payload.address).toEqual({
      zipCode: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: null,
      state: null,
    });
  });

  it('apara os textos e grava CPF e CEP só com dígitos, UF em maiúsculas e e-mail em minúsculas', () => {
    const payload = toPatientPayload({
      ...valid,
      name: '  Dirce  ',
      cpf: '529.982.247-25',
      zipCode: '14091-256',
      state: 'sp',
      email: 'Dirce@Exemplo.Example',
      secondaryConditions: [' Diabetes ', ''],
    });

    expect(payload.name).toBe('Dirce');
    expect(payload.cpf).toBe('52998224725');
    expect(payload.address.zipCode).toBe('14091256');
    expect(payload.address.state).toBe('SP');
    expect(payload.email).toBe('dirce@exemplo.example');
    expect(payload.secondaryConditions).toEqual(['Diabetes']);
  });
});

describe('patientToValues', () => {
  it('leva o paciente da API para o formulário, com máscaras e campos vazios em vez de null', () => {
    const values = patientToValues({
      name: 'Dirce',
      birthDate: '1941-05-17',
      sex: 'female',
      cpf: '52998224725',
      phone: null,
      email: null,
      address: {
        zipCode: '14091256',
        street: 'Rua São Sebastião',
        number: '2013',
        complement: null,
        district: 'Jardim Irajá',
        city: 'Ribeirão Preto',
        state: 'SP',
      },
      mainCondition: 'Hipertensão arterial',
      secondaryConditions: ['Diabetes mellitus tipo 2'],
      healthPlan: null,
      notes: null,
      responsible: { id: 'resp-1', name: 'Rafael', status: 'active' },
    });

    expect(values).toMatchObject({
      name: 'Dirce',
      cpf: '529.982.247-25',
      phone: '',
      zipCode: '14091-256',
      complement: '',
      state: 'SP',
      responsibleUserId: 'resp-1',
      secondaryConditions: ['Diabetes mellitus tipo 2'],
    });
  });
});

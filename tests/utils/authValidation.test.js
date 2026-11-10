// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FIELD_ERRORS as E,
  fieldErrorsFromApi,
  validateConfirmation,
  validateEmail,
  validateOrganizationCode,
  validatePassword,
} from '../../src/utils/authValidation.js';

describe('código da organização', () => {
  it.each([
    ['ipe-amarelo'],
    ['abc'],
    ['clinica-2'],
    ['IPE-AMARELO'],
    ['a'.repeat(50)],
  ])('aceita %s', (value) => {
    expect(validateOrganizationCode(value)).toBeNull();
  });

  it.each([
    ['', E.REQUIRED],
    ['   ', E.REQUIRED],
    ['ab', E.TOO_SHORT],
    ['a'.repeat(51), E.TOO_LONG],
    ['ipe amarelo', E.INVALID],
    ['-ipe', E.INVALID],
    ['ipe--amarelo', E.INVALID],
    ['ipê', E.INVALID],
  ])('recusa "%s" com o erro %s', (value, error) => {
    expect(validateOrganizationCode(value)).toBe(error);
  });
});

describe('e-mail', () => {
  it.each([['helena.vasconcelos@ipeamarelo.example'], [' ana@x.example ']])(
    'aceita %s',
    (value) => {
      expect(validateEmail(value)).toBeNull();
    },
  );

  it.each([
    ['', E.REQUIRED],
    ['helena', E.INVALID],
    ['helena@ipeamarelo', E.INVALID],
    ['helena @x.example', E.INVALID],
    [`${'a'.repeat(245)}@x.example`, E.TOO_LONG],
  ])('recusa "%s" com o erro %s', (value, error) => {
    expect(validateEmail(value)).toBe(error);
  });
});

describe('senha', () => {
  it.each([
    ['12345678'],
    ['a'.repeat(128)],
    // A API conta caracteres, não bytes, e não apara espaços.
    ['áéíóú123'],
    ['        '],
  ])('aceita "%s"', (value) => {
    expect(validatePassword(value)).toBeNull();
  });

  it.each([
    ['', E.REQUIRED],
    ['1234567', E.TOO_SHORT],
    ['a'.repeat(129), E.TOO_LONG],
  ])('recusa "%s" com o erro %s', (value, error) => {
    expect(validatePassword(value)).toBe(error);
  });
});

describe('confirmação da senha', () => {
  it('aceita a confirmação igual à senha', () => {
    expect(validateConfirmation('senha-nova-1', 'senha-nova-1')).toBeNull();
  });

  it('recusa a confirmação vazia', () => {
    expect(validateConfirmation('senha-nova-1', '')).toBe(E.REQUIRED);
  });

  it('recusa a confirmação diferente da senha', () => {
    expect(validateConfirmation('senha-nova-1', 'senha-nova-2')).toBe(
      E.MISMATCH,
    );
  });
});

describe('erros de campo vindos da API', () => {
  it('marca como inválido cada campo apontado no 422', () => {
    const error = {
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: [
        { field: 'organizationCode', code: 'MATCHES' },
        { field: 'email', code: 'IS_EMAIL' },
      ],
    };

    expect(fieldErrorsFromApi(error)).toEqual({
      organizationCode: E.INVALID,
      email: E.INVALID,
    });
  });

  it('não devolve erro de campo para erro sem campos', () => {
    expect(fieldErrorsFromApi({ status: 401, fields: null })).toEqual({});
  });
});

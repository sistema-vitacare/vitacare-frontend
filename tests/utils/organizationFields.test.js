// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { organizationErrors } from '../../src/utils/organizationFields.js';

describe('organizationErrors', () => {
  it('aceita campos ausentes e nulo nos opcionais, que limpa o valor', () => {
    expect(organizationErrors({ tradeName: 'Clínica Centro' })).toEqual([]);
    expect(
      organizationErrors({
        legalName: null,
        document: null,
        phone: null,
        email: null,
      }),
    ).toEqual([]);
  });

  it('recusa nome fantasia nulo, vazio ou acima de 180 caracteres', () => {
    expect(organizationErrors({ tradeName: null })).toEqual([
      { field: 'tradeName', code: 'IS_STRING' },
    ]);
    expect(organizationErrors({ tradeName: '  ' })).toEqual([
      { field: 'tradeName', code: 'MIN_LENGTH' },
    ]);
    expect(organizationErrors({ tradeName: 'a'.repeat(181) })).toEqual([
      { field: 'tradeName', code: 'MAX_LENGTH' },
    ]);
  });

  it('recusa documento sem letra nem dígito e telefone com letra', () => {
    expect(organizationErrors({ document: '../--' })).toEqual([
      { field: 'document', code: 'MATCHES' },
    ]);
    expect(organizationErrors({ phone: '16 3333-abcd' })).toEqual([
      { field: 'phone', code: 'MATCHES' },
    ]);
  });

  it('recusa e-mail inválido e propriedade que não se edita aqui', () => {
    expect(organizationErrors({ email: 'contato@' })).toEqual([
      { field: 'email', code: 'IS_EMAIL' },
    ]);
    expect(organizationErrors({ code: 'outra' })).toEqual([
      { field: 'code', code: 'WHITELIST_VALIDATION' },
    ]);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeUserBody, userErrors } from '../../src/utils/userFields.js';

const valid = {
  name: 'Ana Exemplo',
  email: 'ana@example.test',
  cpf: '529.982.247-25',
  profileCode: 'caregiver',
};

describe('userErrors no cadastro', () => {
  it('aceita o corpo completo, com ou sem telefone', () => {
    expect(userErrors(valid)).toEqual([]);
    expect(userErrors({ ...valid, phone: '(16) 99999-0000' })).toEqual([]);
  });

  it('exige nome, e-mail, CPF e perfil', () => {
    expect(userErrors({})).toEqual([
      { field: 'name', code: 'MIN_LENGTH' },
      { field: 'email', code: 'IS_EMAIL' },
      { field: 'cpf', code: 'IS_CPF' },
      { field: 'profileCode', code: 'IS_IN' },
    ]);
  });

  it('recusa nome só com espaços e nome acima de 180 caracteres', () => {
    expect(userErrors({ ...valid, name: '   ' })).toEqual([
      { field: 'name', code: 'MIN_LENGTH' },
    ]);
    expect(userErrors({ ...valid, name: 'a'.repeat(181) })).toEqual([
      { field: 'name', code: 'MAX_LENGTH' },
    ]);
  });

  it('recusa e-mail inválido e e-mail acima de 254 caracteres', () => {
    expect(userErrors({ ...valid, email: 'ana@' })).toEqual([
      { field: 'email', code: 'IS_EMAIL' },
    ]);
    expect(userErrors({ ...valid, email: `${'a'.repeat(250)}@x.br` })).toEqual([
      { field: 'email', code: 'MAX_LENGTH' },
    ]);
  });

  it('recusa CPF com dígito errado ou com todos os dígitos iguais', () => {
    expect(userErrors({ ...valid, cpf: '529.982.247-26' })).toEqual([
      { field: 'cpf', code: 'IS_CPF' },
    ]);
    expect(userErrors({ ...valid, cpf: '111.111.111-11' })).toEqual([
      { field: 'cpf', code: 'IS_CPF' },
    ]);
  });

  it('recusa telefone com letra ou acima de 32 caracteres', () => {
    expect(userErrors({ ...valid, phone: '16 9999-abcd' })).toEqual([
      { field: 'phone', code: 'MATCHES' },
    ]);
    expect(userErrors({ ...valid, phone: '1'.repeat(33) })).toEqual([
      { field: 'phone', code: 'MAX_LENGTH' },
    ]);
  });

  it('recusa o perfil da plataforma e propriedade fora do contrato', () => {
    expect(userErrors({ ...valid, profileCode: 'platform_admin' })).toEqual([
      { field: 'profileCode', code: 'IS_IN' },
    ]);
    expect(userErrors({ ...valid, status: 'active' })).toEqual([
      { field: 'status', code: 'WHITELIST_VALIDATION' },
    ]);
  });

  it('aceita o canal do convite, que é opcional', () => {
    expect(userErrors({ ...valid, channel: 'email' })).toEqual([]);
    expect(userErrors({ ...valid, channel: 'temporary_password' })).toEqual([]);
  });

  it('recusa canal fora da lista, inclusive nulo', () => {
    expect(userErrors({ ...valid, channel: 'sms' })).toEqual([
      { field: 'channel', code: 'IS_IN' },
    ]);
    expect(userErrors({ ...valid, channel: null })).toEqual([
      { field: 'channel', code: 'IS_IN' },
    ]);
  });
});

describe('userErrors na edição', () => {
  it('aceita só os campos enviados, e o telefone nulo limpa', () => {
    expect(userErrors({ name: 'Ana' }, { partial: true })).toEqual([]);
    expect(userErrors({ phone: null }, { partial: true })).toEqual([]);
  });

  it('recusa nulo em nome, e-mail e CPF', () => {
    expect(
      userErrors({ name: null, email: null, cpf: null }, { partial: true }),
    ).toEqual([
      { field: 'name', code: 'MIN_LENGTH' },
      { field: 'email', code: 'IS_EMAIL' },
      { field: 'cpf', code: 'IS_CPF' },
    ]);
  });

  it('não aceita o perfil, que tem rota própria', () => {
    expect(userErrors({ profileCode: 'admin' }, { partial: true })).toEqual([
      { field: 'profileCode', code: 'WHITELIST_VALIDATION' },
    ]);
  });

  it('não aceita o canal, que só existe no cadastro e na reemissão', () => {
    expect(userErrors({ channel: 'email' }, { partial: true })).toEqual([
      { field: 'channel', code: 'WHITELIST_VALIDATION' },
    ]);
  });
});

describe('normalizeUserBody', () => {
  it('apara o nome, põe o e-mail em minúsculas e deixa só os dígitos do CPF', () => {
    expect(
      normalizeUserBody({
        name: '  Ana Exemplo ',
        email: ' Ana@Example.TEST ',
        cpf: '529.982.247-25',
        phone: ' (16) 99999-0000 ',
        profileCode: 'caregiver',
      }),
    ).toEqual({
      name: 'Ana Exemplo',
      email: 'ana@example.test',
      cpf: '52998224725',
      phone: '(16) 99999-0000',
      profileCode: 'caregiver',
    });
  });

  it('mantém fora o que não veio', () => {
    expect(normalizeUserBody({ phone: null })).toEqual({ phone: null });
  });
});

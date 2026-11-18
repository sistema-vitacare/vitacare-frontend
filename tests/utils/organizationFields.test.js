// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  newOrganizationErrors,
  organizationErrors,
} from '../../src/utils/organizationFields.js';

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

const PLAN_ID = 'd01578d8-133d-5d4f-910d-164cb5daa4c7';
const administrator = {
  name: 'Marta Ribeiro',
  email: 'marta@clinicanova.example',
  cpf: '529.982.247-25',
};
const valid = {
  code: 'clinica-nova',
  tradeName: 'Clínica Nova',
  usagePlanId: PLAN_ID,
  administrator,
};

describe('newOrganizationErrors', () => {
  it('aceita o mínimo do cadastro, com os opcionais ausentes ou preenchidos', () => {
    expect(newOrganizationErrors(valid)).toEqual([]);
    expect(
      newOrganizationErrors({
        ...valid,
        legalName: 'Clínica Nova Ltda.',
        document: '12.345.678/0001-90',
        phone: '(16) 3000-0000',
        email: 'contato@clinicanova.example',
        administrator: { ...administrator, phone: '(16) 99999-0000' },
      }),
    ).toEqual([]);
  });

  it('confere o código como a API: minúsculas, dígitos e hífens simples, de 3 a 50', () => {
    const codeOf = (code) =>
      newOrganizationErrors({ ...valid, code }).map((error) => error.code);
    expect(codeOf('  Clinica-Nova ')).toEqual([]);
    expect(codeOf('')).toEqual(['MIN_LENGTH']);
    expect(codeOf('ab')).toEqual(['MIN_LENGTH']);
    expect(codeOf('a'.repeat(51))).toEqual(['MAX_LENGTH']);
    expect(codeOf('clinica nova')).toEqual(['MATCHES']);
    expect(codeOf('clinica--nova')).toEqual(['MATCHES']);
    expect(codeOf('-clinica')).toEqual(['MATCHES']);
  });

  it('exige nome fantasia e plano', () => {
    expect(
      newOrganizationErrors({ ...valid, tradeName: ' ', usagePlanId: '' }),
    ).toEqual([
      { field: 'tradeName', code: 'MIN_LENGTH' },
      { field: 'usagePlanId', code: 'IS_UUID' },
    ]);
  });

  it('aponta os campos do primeiro administrador pelo caminho aninhado', () => {
    expect(
      newOrganizationErrors({
        ...valid,
        administrator: {
          name: '',
          email: 'marta@',
          cpf: '111.111.111-11',
          phone: 'abc',
        },
      }),
    ).toEqual([
      { field: 'administrator.name', code: 'MIN_LENGTH' },
      { field: 'administrator.email', code: 'IS_EMAIL' },
      { field: 'administrator.cpf', code: 'IS_CPF' },
      { field: 'administrator.phone', code: 'MATCHES' },
    ]);
  });

  it('recusa o cadastro sem administrador e propriedades fora do contrato', () => {
    const { administrator: omitted, ...withoutAdministrator } = valid;
    expect(omitted).toBeDefined();
    expect(newOrganizationErrors(withoutAdministrator)).toEqual([
      { field: 'administrator', code: 'NESTED_VALIDATION' },
    ]);
    expect(
      newOrganizationErrors({
        ...valid,
        status: 'inactive',
        administrator: { ...administrator, profileCode: 'admin' },
      }),
    ).toEqual([
      { field: 'administrator.profileCode', code: 'WHITELIST_VALIDATION' },
      { field: 'status', code: 'WHITELIST_VALIDATION' },
    ]);
  });
});

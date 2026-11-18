// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  checkAnswers,
  isEmptyAnswer,
  parseFieldAnswer,
} from '../../src/utils/followUpAnswers.js';

const field = (props) => ({
  id: 'f',
  name: 'Campo',
  requirement: 'optional',
  decimalPlaces: null,
  scaleMin: null,
  scaleMax: null,
  options: null,
  ...props,
});

const temperature = field({
  id: 't',
  name: 'Temperatura',
  fieldType: 'number',
  decimalPlaces: 1,
});
const pain = field({ id: 'p', fieldType: 'scale', scaleMin: 0, scaleMax: 10 });
const bath = field({ id: 'b', fieldType: 'boolean' });
const appetite = field({
  id: 'a',
  fieldType: 'single_choice',
  options: ['Bom', 'Regular', 'Ruim'],
});
const activities = field({
  id: 'm',
  fieldType: 'multiple_choice',
  options: ['Banho', 'Curativo', 'Fisioterapia'],
});

describe('isEmptyAnswer', () => {
  it('trata nulo, texto em branco e lista vazia como vazios, e 0 e false como valores', () => {
    expect([null, undefined, '', '   ', []].map(isEmptyAnswer)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect([0, false, 'x', ['a']].map(isEmptyAnswer)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('parseFieldAnswer', () => {
  it('aceita número com até as casas do campo e devolve o número', () => {
    expect(parseFieldAnswer(temperature, 36.5)).toEqual({
      kind: 'value',
      value: 36.5,
    });
    expect(parseFieldAnswer(temperature, '37.50')).toEqual({
      kind: 'value',
      value: 37.5,
    });
  });

  it('recusa texto que não é número e casas decimais além do campo', () => {
    expect(parseFieldAnswer(temperature, 'febre')).toEqual({
      kind: 'invalid',
      code: 'NOT_A_NUMBER',
    });
    expect(parseFieldAnswer(temperature, 36.55)).toEqual({
      kind: 'invalid',
      code: 'TOO_MANY_DECIMALS',
    });
  });

  it('aceita só inteiro dentro da escala', () => {
    expect(parseFieldAnswer(pain, 0)).toEqual({ kind: 'value', value: 0 });
    expect(parseFieldAnswer(pain, 11)).toEqual({
      kind: 'invalid',
      code: 'OUT_OF_SCALE',
    });
    expect(parseFieldAnswer(pain, '3')).toEqual({
      kind: 'invalid',
      code: 'INVALID_TYPE',
    });
  });

  it('aceita só booleano no sim e não', () => {
    expect(parseFieldAnswer(bath, false)).toEqual({
      kind: 'value',
      value: false,
    });
    expect(parseFieldAnswer(bath, 'não')).toEqual({
      kind: 'invalid',
      code: 'NOT_A_BOOLEAN',
    });
  });

  it('apara o texto e recusa acima de 2000 caracteres', () => {
    const text = field({ fieldType: 'text' });

    expect(parseFieldAnswer(text, '  Caiu no banho  ')).toEqual({
      kind: 'value',
      value: 'Caiu no banho',
    });
    expect(parseFieldAnswer(text, 'a'.repeat(2001))).toEqual({
      kind: 'invalid',
      code: 'TOO_LONG',
    });
  });

  it('aceita só opções do campo e devolve a múltipla escolha na ordem das opções', () => {
    expect(parseFieldAnswer(appetite, 'Ótimo')).toEqual({
      kind: 'invalid',
      code: 'NOT_AN_OPTION',
    });
    expect(parseFieldAnswer(activities, ['Fisioterapia', 'Banho'])).toEqual({
      kind: 'value',
      value: ['Banho', 'Fisioterapia'],
    });
    expect(parseFieldAnswer(activities, ['Banho', 'Banho'])).toEqual({
      kind: 'invalid',
      code: 'DUPLICATE_OPTION',
    });
  });

  it('recusa valor em campo desabilitado', () => {
    expect(
      parseFieldAnswer(
        field({ fieldType: 'boolean', requirement: 'disabled' }),
        true,
      ),
    ).toEqual({ kind: 'invalid', code: 'DISABLED' });
  });
});

describe('checkAnswers', () => {
  const required = field({
    id: 'r',
    name: 'Pressão sistólica',
    fieldType: 'number',
    decimalPlaces: 0,
    requirement: 'required',
  });
  const fields = [required, temperature, pain, bath];

  it('chama de vazio o envio sem nenhum valor, mesmo com campo obrigatório', () => {
    expect(
      checkAnswers(fields, [
        { fieldId: 't', value: null },
        { fieldId: 'b', value: '' },
      ]),
    ).toEqual({ kind: 'empty' });
  });

  it('aponta o obrigatório ausente pelo id do campo, com a mensagem', () => {
    expect(checkAnswers(fields, [{ fieldId: 'b', value: false }])).toEqual({
      kind: 'invalid',
      errors: [
        {
          field: 'answers.r',
          code: 'REQUIRED',
          message: 'Pressão sistólica é obrigatório.',
        },
      ],
    });
  });

  it('aponta valor inválido, campo desconhecido e campo repetido pela posição na lista', () => {
    expect(
      checkAnswers(fields, [
        { fieldId: 'r', value: 120 },
        { fieldId: 'p', value: 12 },
        { fieldId: 'x', value: 1 },
        { fieldId: 'r', value: 130 },
      ]),
    ).toEqual({
      kind: 'invalid',
      errors: [
        { field: 'answers.1.value', code: 'OUT_OF_SCALE' },
        { field: 'answers.2.fieldId', code: 'UNKNOWN' },
        { field: 'answers.3.fieldId', code: 'DUPLICATE' },
      ],
    });
  });

  it('devolve só os campos preenchidos, com o valor no tipo do campo', () => {
    expect(
      checkAnswers(fields, [
        { fieldId: 'r', value: '128' },
        { fieldId: 't', value: null },
        { fieldId: 'p', value: 0 },
        { fieldId: 'b', value: false },
      ]),
    ).toEqual({
      kind: 'valid',
      items: [
        { fieldId: 'r', value: 128 },
        { fieldId: 'p', value: 0 },
        { fieldId: 'b', value: false },
      ],
    });
  });
});

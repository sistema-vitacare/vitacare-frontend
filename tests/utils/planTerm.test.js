// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  decisionNoteError,
  endOfDayInSaoPaulo,
  planTermFieldErrors,
  planTermRuleError,
} from '../../src/utils/planTerm.js';
import { BASIC, ENTERPRISE } from '../support/fixtures/organizations.js';

const NOW = new Date('2026-11-16T15:00:00.000Z');

describe('planTermFieldErrors', () => {
  it('aceita o corpo vazio, que volta ao padrão: sem vencimento e limites do catálogo', () => {
    expect(planTermFieldErrors({})).toEqual([]);
    expect(
      planTermFieldErrors({
        endsAt: null,
        userLimit: null,
        patientLimit: null,
      }),
    ).toEqual([]);
  });

  it('recusa data fora de ISO 8601 e limite não inteiro, negativo ou acima de 100.000', () => {
    expect(
      planTermFieldErrors({
        endsAt: '20/12/2026',
        userLimit: 60.5,
        patientLimit: 100001,
      }),
    ).toEqual([
      { field: 'endsAt', code: 'IS_ISO8601' },
      { field: 'userLimit', code: 'IS_INT' },
      { field: 'patientLimit', code: 'MAX' },
    ]);
    expect(planTermFieldErrors({ userLimit: -1 })).toEqual([
      { field: 'userLimit', code: 'MIN' },
    ]);
  });

  it('confere o motivo da atribuição e a justificativa da aprovação, até 500 caracteres', () => {
    expect(planTermFieldErrors({ reason: '   ' })).toEqual([
      { field: 'reason', code: 'MIN_LENGTH' },
    ]);
    expect(
      planTermFieldErrors(
        { decisionNote: 'x'.repeat(501) },
        { noteField: 'decisionNote' },
      ),
    ).toEqual([{ field: 'decisionNote', code: 'MAX_LENGTH' }]);
    expect(planTermFieldErrors({ reason: 'Renovação anual' })).toEqual([]);
  });
});

describe('planTermRuleError', () => {
  const rule = (body, plan = ENTERPRISE) =>
    planTermRuleError(body, { plan, now: NOW });

  it('recusa a data de fim igual ou anterior ao instante atual', () => {
    expect(rule({ endsAt: NOW.toISOString() })).toEqual({
      field: 'endsAt',
      code: 'IN_PAST',
    });
    expect(rule({ endsAt: '2026-12-31T23:59:59.999-03:00' })).toBeNull();
  });

  it('só aceita limite personalizado no plano expansível', () => {
    expect(rule({ patientLimit: 300 }, BASIC)).toEqual({
      field: 'patientLimit',
      code: 'NOT_EXPANDABLE',
    });
  });

  it('nunca aceita limite abaixo do catálogo, conferindo usuários antes de pacientes', () => {
    expect(rule({ userLimit: 49, patientLimit: 999 })).toEqual({
      field: 'userLimit',
      code: 'BELOW_CATALOG',
    });
    expect(rule({ userLimit: 50, patientLimit: 1500 })).toBeNull();
  });

  it('confere a data antes dos limites, como a API', () => {
    expect(rule({ endsAt: '2026-11-01T00:00:00.000Z', userLimit: 10 })).toEqual(
      { field: 'endsAt', code: 'IN_PAST' },
    );
  });
});

describe('decisionNoteError', () => {
  it('exige a justificativa da recusa, de 1 a 500 caracteres', () => {
    expect(decisionNoteError('')).toBe('MIN_LENGTH');
    expect(decisionNoteError('  ')).toBe('MIN_LENGTH');
    expect(decisionNoteError('x'.repeat(501))).toBe('MAX_LENGTH');
    expect(decisionNoteError('Volume ainda cabe no Basic.')).toBeNull();
  });
});

describe('endOfDayInSaoPaulo', () => {
  it('leva o dia escolhido às 23:59 de Brasília, em UTC', () => {
    expect(endOfDayInSaoPaulo('2026-12-20')).toBe('2026-12-21T02:59:59.999Z');
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  planExpiryMessage,
  planExpiryWarning,
} from '../../src/utils/planExpiry.js';

// Vigência que termina às 23:59 de 16/11/2026 em Brasília.
const ENDS_AT = '2026-11-17T02:59:00.000Z';
const at = (local) => new Date(`${local}-03:00`);

describe('planExpiryWarning', () => {
  it('sem fim de vigência ou antes das 08:00 do sétimo dia antes, não avisa', () => {
    expect(planExpiryWarning(null, at('2026-11-12T10:00:00'))).toBeNull();
    expect(planExpiryWarning(ENDS_AT, at('2026-11-09T07:59:00'))).toBeNull();
  });

  it('avisa sete dias antes, a partir das 08:00 de Brasília', () => {
    expect(planExpiryWarning(ENDS_AT, at('2026-11-09T08:00:00'))).toBe(
      'within_7_days',
    );
    expect(planExpiryWarning(ENDS_AT, at('2026-11-15T07:59:00'))).toBe(
      'within_7_days',
    );
  });

  it('avisa um dia antes, a partir das 08:00 da véspera', () => {
    expect(planExpiryWarning(ENDS_AT, at('2026-11-15T08:00:00'))).toBe(
      'within_1_day',
    );
  });

  it('marca como vencido desde o fim da vigência', () => {
    expect(planExpiryWarning(ENDS_AT, at('2026-11-16T23:59:00'))).toBe(
      'expired',
    );
  });
});

describe('planExpiryMessage', () => {
  it('sem aviso, não há mensagem', () => {
    expect(planExpiryMessage(null, ENDS_AT)).toBeNull();
  });

  it('antes do fim, diz quando vence e o que fica bloqueado depois', () => {
    expect(planExpiryMessage('within_7_days', ENDS_AT)).toBe(
      'O plano vence em 16/11/2026 às 23:59 (horário de Brasília). Depois disso, novos cadastros e reativações de usuários e pacientes ficam bloqueados até a renovação. Solicite a renovação na área de plano.',
    );
  });

  it('vencido, diz o que está bloqueado e o que continua', () => {
    expect(planExpiryMessage('expired', ENDS_AT)).toBe(
      'O plano venceu em 16/11/2026 às 23:59 (horário de Brasília). Novos cadastros e reativações de usuários e pacientes estão bloqueados até a renovação; a consulta e os registros continuam. Solicite a renovação na área de plano.',
    );
  });
});

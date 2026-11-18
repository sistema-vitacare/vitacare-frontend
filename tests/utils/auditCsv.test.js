// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { auditCsvFileName, toAuditCsv } from '../../src/utils/auditCsv.js';

const HEADER =
  'Data/hora;Organização;Usuário;Perfil;Ação;Código da ação;Gravidade;Tipo do item;Id do item;Item;IP;Request id';

const userEvent = {
  id: 'e1',
  occurredAt: '2026-10-01T03:00:00.000Z',
  organization: { id: 'o1', name: 'Clinica Exemplo' },
  actor: {
    type: 'user',
    user: { id: 'u1', name: 'Carla Exemplo' },
    profile: { code: 'admin', name: 'Administrador' },
  },
  action: 'user.deactivated',
  actionLabel: 'Inativou usuário',
  severity: 'warning',
  entity: { type: 'user', id: 'u9', label: 'Paulo Exemplo' },
  ipAddress: '192.0.2.10',
  requestId: 'r1',
};

const systemEvent = {
  ...userEvent,
  id: 'e2',
  occurredAt: '2026-10-15T12:00:00.000Z',
  actor: { type: 'system', user: null, profile: null },
  action: 'alert.generated',
  actionLabel: 'Gerou alerta',
  severity: 'critical',
  entity: { type: 'alert', id: 'a1', label: null },
  ipAddress: null,
  requestId: null,
};

describe('toAuditCsv', () => {
  it('sem eventos, gera só o cabeçalho, com BOM e CRLF', () => {
    expect(toAuditCsv([])).toBe(`\uFEFF${HEADER}\r\n`);
  });

  it('gera uma linha por evento, com a data no horário de Brasília e "Sistema" no evento automático', () => {
    expect(toAuditCsv([systemEvent, userEvent]).split('\r\n')).toEqual([
      `\uFEFF${HEADER}`,
      '2026-10-15T09:00:00-03:00;Clinica Exemplo;Sistema;;Gerou alerta;alert.generated;critical;alert;a1;;;',
      '2026-10-01T00:00:00-03:00;Clinica Exemplo;Carla Exemplo;Administrador;Inativou usuário;user.deactivated;warning;user;u9;Paulo Exemplo;192.0.2.10;r1',
      '',
    ]);
  });

  it('põe entre aspas a célula com ponto e vírgula, aspas ou quebra de linha', () => {
    const line = toAuditCsv([
      {
        ...userEvent,
        entity: { ...userEvent.entity, label: 'Ana; "Ju"\nSilva' },
      },
    ]).split('\r\n')[1];

    expect(line).toContain(';"Ana; ""Ju""\nSilva";');
  });

  it('neutraliza a célula que a planilha leria como fórmula', () => {
    const line = toAuditCsv([
      { ...userEvent, entity: { ...userEvent.entity, label: '=SOMA(A1)' } },
    ]).split('\r\n')[1];

    expect(line).toContain(";'=SOMA(A1);");
  });

  it('deixa fora os valores gravados, que ficam só no detalhe', () => {
    const csv = toAuditCsv([
      { ...userEvent, afterValues: { changedFields: ['phone'] } },
    ]);

    expect(csv).not.toContain('changedFields');
  });
});

describe('auditCsvFileName', () => {
  it('leva só o período, como o Content-Disposition da API', () => {
    expect(auditCsvFileName({ from: '2026-10-01', to: '2026-10-31' })).toBe(
      'auditoria-2026-10-01-a-2026-10-31.csv',
    );
  });
});

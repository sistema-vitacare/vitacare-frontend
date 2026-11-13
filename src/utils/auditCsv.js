// CSV da auditoria no formato da API (`auditCsv.service.ts` do backend,
// conferido em 12/11/2026): UTF-8 com BOM e `;`, para abrir direto no Excel
// em português, uma linha por evento e sem os valores gravados, que ficam
// só no detalhe.
import { SAO_PAULO_OFFSET } from './format.js';

const HEADER = [
  'Data/hora',
  'Organização',
  'Usuário',
  'Perfil',
  'Ação',
  'Código da ação',
  'Gravidade',
  'Tipo do item',
  'Id do item',
  'Item',
  'IP',
  'Request id',
];

const SEPARATOR = ';';
const LINE_END = '\r\n';
const BOM = '﻿';
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** ISO 8601 no horário de Brasília, com o deslocamento (UTC−3 o ano todo). */
function localIso(instant) {
  const local = new Date(Date.parse(instant) - OFFSET_MS).toISOString();
  return `${local.slice(0, 19)}${SAO_PAULO_OFFSET}`;
}

// A planilha não executa fórmula vinda de dado (injeção de CSV).
const neutralize = (value) =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

function cell(value) {
  const text = neutralize(value ?? '');
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(event) {
  const system = event.actor.type === 'system';
  return [
    localIso(event.occurredAt),
    event.organization.name,
    system ? 'Sistema' : (event.actor.user?.name ?? ''),
    event.actor.profile?.name ?? null,
    event.actionLabel,
    event.action,
    event.severity,
    event.entity.type,
    event.entity.id,
    event.entity.label,
    event.ipAddress,
    event.requestId,
  ];
}

/** Texto do arquivo, a partir dos eventos no formato da lista da API. */
export function toAuditCsv(events) {
  const lines = [HEADER, ...events.map(row)];
  return (
    BOM +
    lines.map((values) => values.map(cell).join(SEPARATOR)).join(LINE_END) +
    LINE_END
  );
}

/** Nome do arquivo do `Content-Disposition` da API: só o período. */
export function auditCsvFileName({ from, to }) {
  return `auditoria-${from}-a-${to}.csv`;
}

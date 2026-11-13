// Contas do painel operacional, com as regras de `dashboardPeriod.policy.ts`
// e da consulta dos alertas prioritários do backend (manual
// `dashboard-resumo.md`, conferido em 12/11/2026).
import { todayInSaoPaulo } from './format.js';
import { periodDays } from './period.js';

/** O dia do instante em Brasília está entre o início e o fim, inclusive. */
export function isInPeriod(instant, { from, to }) {
  const day = todayInSaoPaulo(new Date(instant));
  return day >= from && day <= to;
}

/** Total de cada dia do período, com zero onde nada aconteceu. */
export function countByDay(instants, period) {
  const totals = new Map();
  for (const instant of instants) {
    const day = todayInSaoPaulo(new Date(instant));
    totals.set(day, (totals.get(day) ?? 0) + 1);
  }
  return periodDays(period).map((date) => ({
    date,
    total: totals.get(date) ?? 0,
  }));
}

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

/** Crítico, depois atenção, depois informativo; em cada um, o mais recente primeiro. */
export function sortByPriority(alerts) {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Date.parse(b.generatedAt) - Date.parse(a.generatedAt),
  );
}

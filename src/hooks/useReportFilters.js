import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { fieldErrorsFrom } from '../utils/fieldErrors.js';
import { todayInSaoPaulo } from '../utils/format.js';
import { resolvePeriod } from '../utils/period.js';

// Período e condição no endereço, com nomes em português, como os outros
// filtros; o paciente e o tipo de relatório ficam nos próprios parâmetros.
const PARAMS = { from: 'de', to: 'ate', condition: 'condicao' };

/**
 * Filtros dos relatórios: o período segue a regra da API, apontada no campo
 * antes do pedido; `query` leva só o que foi preenchido, e sem período a
 * API usa os últimos 30 dias.
 */
export function useReportFilters() {
  const [params, setParams] = useSearchParams();
  const from = params.get(PARAMS.from) ?? '';
  const to = params.get(PARAMS.to) ?? '';
  const condition = params.get(PARAMS.condition) ?? '';

  const errors = useMemo(
    () =>
      fieldErrorsFrom(resolvePeriod({ from, to }, todayInSaoPaulo()).errors),
    [from, to],
  );
  const query = useMemo(
    () => ({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(condition.trim() ? { condition: condition.trim() } : {}),
    }),
    [from, to, condition],
  );

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      if (value) {
        next.set(PARAMS[name], value);
      } else {
        next.delete(PARAMS[name]);
      }
    }
    setParams(next, { replace: true });
  }

  return {
    from,
    to,
    condition,
    errors,
    valid: Object.keys(errors).length === 0,
    query,
    update,
  };
}

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_SHORTCUT, PERIOD_SHORTCUTS } from '../constants/dashboard.js';
import { PERIOD_PARAM } from '../constants/routes.js';
import { todayInSaoPaulo } from '../utils/format.js';
import { shortcutPeriod } from '../utils/period.js';

/**
 * Atalho de período do painel, guardado no endereço (`?periodo=`), e as
 * datas dele. O padrão de 30 dias não aparece no endereço, e um valor
 * desconhecido vale o padrão.
 */
export function useDashboardPeriod() {
  const [params, setParams] = useSearchParams();
  const raw = params.get(PERIOD_PARAM);
  const shortcut = PERIOD_SHORTCUTS.includes(raw) ? raw : DEFAULT_SHORTCUT;
  const period = useMemo(
    () => shortcutPeriod(shortcut, todayInSaoPaulo()),
    [shortcut],
  );
  const setShortcut = useCallback(
    (next) => {
      setParams((current) => {
        const updated = new URLSearchParams(current);
        if (next === DEFAULT_SHORTCUT) {
          updated.delete(PERIOD_PARAM);
        } else {
          updated.set(PERIOD_PARAM, next);
        }
        return updated;
      });
    },
    [setParams],
  );
  return { shortcut, period, setShortcut };
}

import { useCallback, useMemo, useState } from 'react';
import { listFollowUps } from '../services/followUpService.js';
import { useResource } from './useResource.js';

// As opções dos filtros vêm dos registros do próprio paciente.
const OPTIONS_LIMIT = 100;

const EMPTY_FILTERS = {
  from: '',
  to: '',
  formId: '',
  authorUserId: '',
  page: 1,
};

function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [item[key], item])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  );
}

/**
 * Filtros da lista de registros de um paciente (período, formulário e
 * autor) e as opções deles. Mudar um filtro volta à primeira página.
 */
export function useFollowUpFilters(patientId) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const loadOptions = useCallback(
    () => listFollowUps({ patientId, limit: OPTIONS_LIMIT }),
    [patientId],
  );
  const optionsResource = useResource(loadOptions);
  const options = useMemo(() => {
    const items = optionsResource.data ?? [];
    return {
      forms: uniqueBy(
        items.map((item) => item.form),
        'id',
      ),
      authors: uniqueBy(
        items.map((item) => item.author),
        'id',
      ),
    };
  }, [optionsResource.data]);

  const update = useCallback((changes, { keepPage = false } = {}) => {
    setFilters((current) => ({
      ...current,
      ...changes,
      page: keepPage ? changes.page : 1,
    }));
  }, []);

  return { filters, update, options };
}

import { useCallback, useEffect, useState } from 'react';
import { listPatients } from '../services/patientService.js';
import { useResource } from './useResource.js';

/** Pacientes da primeira página e de cada busca (o plano admite 1.000). */
export const PATIENTS_LIMIT = 100;
// Espera entre as teclas antes de pedir a busca à API.
const SEARCH_DELAY_MS = 300;
const noSearch = () => Promise.resolve({ data: null, meta: {} });

function useSettled(value) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

/**
 * Opções das escolhas de paciente: a primeira página (`patients`) e, com
 * texto digitado, a busca na API somada a ela, para achar quem não coube na
 * página. Devolve as opções, o texto (`input` e `setInput`) e se a busca
 * carrega.
 */
export function usePatientSearch(patients) {
  const [input, setInput] = useState('');
  const term = useSettled(input.trim());
  const loadMatches = useCallback(
    () =>
      term ? listPatients({ search: term, limit: PATIENTS_LIMIT }) : noSearch(),
    [term],
  );
  const matches = useResource(loadMatches);
  const answered = ['success', 'empty'].includes(matches.status);
  // A busca da API não ignora acento; o filtro do Autocomplete, sim. Somar a
  // resposta à primeira página mantém quem já aparecia ao digitar sem acento.
  const found =
    term && answered
      ? [
          ...patients,
          ...(matches.data ?? []).filter(
            (match) => !patients.some((patient) => patient.id === match.id),
          ),
        ]
      : patients;
  return {
    found,
    input,
    setInput,
    loading: Boolean(term) && matches.status === 'loading',
  };
}

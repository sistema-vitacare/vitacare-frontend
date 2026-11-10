import { useCallback, useEffect, useState } from 'react';

function isEmpty(data) {
  return data == null || (Array.isArray(data) && data.length === 0);
}

/**
 * Executa `load` (uma função que devolve `{ data, meta }` de um serviço) e
 * expõe o estado da requisição: `loading`, `success`, `empty` ou `error`.
 *
 * `load` precisa ser estável entre renderizações (`useCallback` com os
 * filtros como dependência): uma função nova a cada render dispararia uma
 * requisição a cada render.
 */
export function useResource(load) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Resposta que chega depois de a tela trocar de filtro ou desmontar é
    // descartada, para não sobrescrever o resultado mais novo.
    let active = true;
    load().then(
      (response) => {
        if (active) {
          setResult({
            load,
            attempt,
            status: isEmpty(response.data) ? 'empty' : 'success',
            data: response.data,
            meta: response.meta,
            error: null,
          });
        }
      },
      (error) => {
        if (active) {
          setResult({ load, attempt, status: 'error', error });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  // O carregamento não é gravado no estado: ele vale enquanto o resultado
  // guardado for de outra carga ou de outra tentativa.
  if (result && result.load === load && result.attempt === attempt) {
    return {
      status: result.status,
      data: result.data,
      meta: result.meta,
      error: result.error,
      retry,
    };
  }
  return {
    status: 'loading',
    data: undefined,
    meta: undefined,
    error: null,
    retry,
  };
}

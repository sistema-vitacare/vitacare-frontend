import { useCallback, useState } from 'react';

const IDLE = { status: 'idle', data: null, meta: null, error: null };

/**
 * Envia uma ação de um serviço (cadastro, pedido, troca de senha) e expõe o
 * estado: `idle`, `submitting`, `success` ou `error`. É o par do
 * `useResource` para escrita: a tela não chama o serviço direto e trata o
 * erro pelo estado, sem `try` em cada formulário.
 */
export function useSubmit(action) {
  const [state, setState] = useState(IDLE);

  const submit = useCallback(
    async (...args) => {
      setState({ ...IDLE, status: 'submitting' });
      try {
        const response = await action(...args);
        setState({
          status: 'success',
          data: response.data,
          meta: response.meta,
          error: null,
        });
      } catch (error) {
        setState({ ...IDLE, status: 'error', error });
      }
    },
    [action],
  );

  return { ...state, submit };
}

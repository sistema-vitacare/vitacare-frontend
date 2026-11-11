import { useCallback, useState } from 'react';

const IDLE = { status: 'idle', data: null, meta: null, error: null };

/**
 * Envia uma ação de um serviço (cadastro, pedido, troca de senha) e expõe o
 * estado: `idle`, `submitting`, `success` ou `error`. É o par do
 * `useResource` para escrita: a tela não chama o serviço direto e trata o
 * erro pelo estado, sem `try` em cada formulário. `submit` também devolve
 * `{ data, error }`, para a tela reagir ao resultado daquele envio (levar o
 * erro ao campo, navegar depois de salvar).
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
        return { data: response.data, error: null };
      } catch (error) {
        setState({ ...IDLE, status: 'error', error });
        return { data: null, error };
      }
    },
    [action],
  );

  return { ...state, submit };
}

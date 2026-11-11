import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSubmit } from '../../src/hooks/useSubmit.js';
import { ApiError, respond } from '../../src/services/mockApi.js';

const conflict = () =>
  new ApiError({ status: 409, code: 'CONFLICT', message: 'Conflito.' });

describe('useSubmit', () => {
  it('começa parado, sem resposta nem erro', () => {
    const { result } = renderHook(() => useSubmit(() => respond(null)));

    expect(result.current.status).toBe('idle');
    expect(result.current.meta).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fica enviando até a resposta chegar', async () => {
    let finish;
    const action = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const { result } = renderHook(() => useSubmit(action));

    act(() => {
      result.current.submit();
    });
    expect(result.current.status).toBe('submitting');

    await act(async () => finish(respond(null)));
    expect(result.current.status).toBe('success');
  });

  it('repassa os argumentos à ação e guarda dados e meta da resposta', async () => {
    const action = async (values) => respond(values, { message: 'Recebido.' });
    const { result } = renderHook(() => useSubmit(action));

    await act(() => result.current.submit({ email: 'a@b.example' }));

    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual({ email: 'a@b.example' });
    expect(result.current.meta.message).toBe('Recebido.');
  });

  it('guarda o erro da ação sem lançá-lo para a tela', async () => {
    const action = async () => {
      throw conflict();
    };
    const { result } = renderHook(() => useSubmit(action));

    await act(() => result.current.submit());

    expect(result.current.status).toBe('error');
    expect(result.current.error.code).toBe('CONFLICT');
  });

  it('limpa o erro anterior a cada novo envio', async () => {
    let fail = true;
    const action = async () => {
      if (fail) {
        throw conflict();
      }
      return respond(null);
    };
    const { result } = renderHook(() => useSubmit(action));
    await act(() => result.current.submit());

    fail = false;
    await act(() => result.current.submit());

    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('devolve a quem chamou a resposta ou o erro do envio', async () => {
    let fail = false;
    const action = async () => {
      if (fail) {
        throw conflict();
      }
      return respond({ id: 'p1' });
    };
    const { result } = renderHook(() => useSubmit(action));

    let outcome;
    await act(async () => {
      outcome = await result.current.submit();
    });
    expect(outcome).toEqual({ data: { id: 'p1' }, error: null });

    fail = true;
    await act(async () => {
      outcome = await result.current.submit();
    });
    expect(outcome.data).toBeNull();
    expect(outcome.error.code).toBe('CONFLICT');
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResource } from '../../src/hooks/useResource.js';
import { ApiError, respond } from '../../src/services/mockApi.js';

const serverError = () =>
  new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falhou.' });

describe('useResource', () => {
  it('começa carregando, sem dados nem erro', () => {
    const load = () => new Promise(() => {});
    const { result } = renderHook(() => useResource(load));

    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('termina com os dados e o meta da resposta', async () => {
    const load = () => Promise.resolve(respond([{ id: 1 }]));
    const { result } = renderHook(() => useResource(load));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.meta.requestId).toEqual(expect.any(String));
  });

  it('fica vazio quando a lista volta sem itens', async () => {
    const load = () => Promise.resolve(respond([]));
    const { result } = renderHook(() => useResource(load));

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('fica em erro, com o ApiError recebido, quando a requisição falha', async () => {
    const load = () => Promise.reject(serverError());
    const { result } = renderHook(() => useResource(load));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error.code).toBe('INTERNAL_ERROR');
  });

  it('tenta de novo e chega aos dados depois de uma falha', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce(respond(['ok']));
    const { result } = renderHook(() => useResource(load));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual(['ok']);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('carrega de novo quando a função de carga muda', async () => {
    const first = () => Promise.resolve(respond(['página 1']));
    const second = () => Promise.resolve(respond(['página 2']));
    const { result, rerender } = renderHook(({ load }) => useResource(load), {
      initialProps: { load: first },
    });
    await waitFor(() => expect(result.current.data).toEqual(['página 1']));

    rerender({ load: second });

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.data).toEqual(['página 2']));
  });
});

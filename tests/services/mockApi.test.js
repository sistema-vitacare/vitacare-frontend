// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError as ClientError } from '../../src/services/apiClient.js';
import {
  ApiError,
  registerMockState,
  resetMockState,
  respond,
} from '../../src/services/mockApi.js';

afterEach(() => {
  resetMockState();
});

describe('respond', () => {
  it('envelopa os dados com requestId e timestamp em meta', () => {
    const response = respond({ id: 7 });

    expect(response.data).toEqual({ id: 7 });
    expect(response.meta.requestId).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(response.meta.timestamp))).toBe(false);
  });

  it('acrescenta a meta os campos extras, como a mensagem da recuperação de senha', () => {
    const response = respond(null, { message: 'Procure o administrador.' });

    expect(response.data).toBeNull();
    expect(response.meta.message).toBe('Procure o administrador.');
    expect(response.meta.requestId).toEqual(expect.any(String));
  });
});

describe('resetMockState', () => {
  it('zera o estado que um módulo registrou', () => {
    let attempts = 3;
    registerMockState(() => {
      attempts = 0;
    });

    resetMockState();

    expect(attempts).toBe(0);
  });
});

describe('ApiError', () => {
  it('é o mesmo erro do cliente HTTP', () => {
    expect(ApiError).toBe(ClientError);
  });
});

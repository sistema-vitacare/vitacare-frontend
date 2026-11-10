// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import {
  ApiError,
  failNextRequest,
  mockRequest,
  notFoundError,
  paginate,
  registerMockState,
  resetMockState,
  respond,
  validationError,
} from '../../src/services/mockApi.js';

const items = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }));

afterEach(() => {
  resetMockState();
});

describe('paginate', () => {
  it('devolve a primeira página com o tamanho pedido e o total', () => {
    const response = paginate(items, { page: 1, limit: 20 });

    expect(response.data).toHaveLength(20);
    expect(response.data[0]).toEqual({ id: 1 });
    expect(response.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('devolve o restante na última página', () => {
    const response = paginate(items, { page: 3, limit: 20 });

    expect(response.data).toHaveLength(5);
    expect(response.data[0]).toEqual({ id: 41 });
  });

  it('devolve lista vazia além da última página, mantendo o total', () => {
    const response = paginate(items, { page: 4, limit: 20 });

    expect(response.data).toEqual([]);
    expect(response.meta.pagination).toEqual({
      page: 4,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('usa página 1 e limite 20 quando não informados, como a API', () => {
    const response = paginate(items.slice(0, 25));

    expect(response.data).toHaveLength(20);
    expect(response.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
    });
  });

  it('devolve dados vazios para uma lista vazia', () => {
    expect(paginate([]).data).toEqual([]);
  });
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
  it('zera também o estado registrado por um serviço simulado', () => {
    let attempts = 3;
    registerMockState(() => {
      attempts = 0;
    });

    resetMockState();

    expect(attempts).toBe(0);
  });
});

describe('erros', () => {
  it('cria erro de validação com status 422, código VALIDATION_FAILED e campos', () => {
    const fields = [{ field: 'cpf', code: 'IS_CPF', message: 'CPF inválido.' }];
    const error = validationError(fields);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.fields).toEqual(fields);
  });

  it('cria erro de item não encontrado com status 404 e código NOT_FOUND', () => {
    const error = notFoundError('Paciente não encontrado.');

    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Paciente não encontrado.');
  });
});

describe('mockRequest', () => {
  it('resolve com o resultado do handler', async () => {
    await expect(mockRequest(() => respond([1, 2]))).resolves.toEqual(
      expect.objectContaining({ data: [1, 2] }),
    );
  });

  it('rejeita com o erro lançado pelo handler', async () => {
    await expect(
      mockRequest(() => {
        throw notFoundError('Paciente não encontrado.');
      }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('faz só a próxima requisição falhar depois de failNextRequest', async () => {
    failNextRequest();

    await expect(mockRequest(() => respond('a'))).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(mockRequest(() => respond('b'))).resolves.toEqual(
      expect.objectContaining({ data: 'b' }),
    );
  });
});

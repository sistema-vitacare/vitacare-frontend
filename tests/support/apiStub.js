// Stub do `fetch` para os testes: cada rota da API responde o que o teste
// mandar, e cada requisição fica guardada para o teste conferir o que a tela
// pediu. Nenhuma regra do backend é copiada aqui: a API filtra, pagina e
// confere; o teste só diz qual seria a resposta.
import { vi } from 'vitest';

const API_PREFIX = '/api/v1';

let current = null;

/** Resposta com outro status (`202`, `204`, erro). */
export function reply(status, body) {
  return { stubReply: true, status, body };
}

/** Erro no formato `{ error, meta }` da API. */
export function apiFailure(status, code, message, fields = null) {
  return reply(status, {
    error: { code, message, detail: null, fields },
    meta: { status },
  });
}

/** Página no formato das listagens da API. */
export function apiPage(items, { page = 1, limit = 20, total, message } = {}) {
  const count = total ?? items.length;
  return {
    data: items,
    meta: {
      requestId: 'teste',
      timestamp: '2026-11-19T12:00:00.000Z',
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
      ...(message ? { message } : {}),
    },
  };
}

// `GET /patients/:patientId` casa com `GET /patients/p1`, com o parâmetro.
function match(pattern, method, path) {
  const [patternMethod, patternPath] = pattern.split(' ');
  if (patternMethod !== method) {
    return null;
  }
  const expected = patternPath.split('/');
  const actual = path.split('/');
  if (expected.length !== actual.length) {
    return null;
  }
  const params = {};
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index].startsWith(':')) {
      params[expected[index].slice(1)] = decodeURIComponent(actual[index]);
    } else if (expected[index] !== actual[index]) {
      return null;
    }
  }
  return params;
}

function toResponse(result) {
  const { status, body } = result?.stubReply
    ? result
    : { status: 200, body: result };
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readBody(body) {
  if (typeof body !== 'string') {
    return body;
  }
  return JSON.parse(body);
}

/**
 * Troca o `fetch` pelo stub com as rotas `handlers` (`'GET /patients':
 * (request) => corpo`). Devolve o controle: `use` acrescenta ou troca rotas,
 * `fail` faz a próxima chamada de uma rota falhar, `requests` e `last`
 * mostram o que foi pedido.
 */
export function stubApi(handlers = {}) {
  let routes = { ...handlers };
  const failures = new Map();
  const requests = [];

  vi.stubGlobal('fetch', async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? 'GET';
    const path = url.pathname.replace(API_PREFIX, '');
    const found = Object.keys(routes)
      .map((key) => ({ key, params: match(key, method, path) }))
      .find((candidate) => candidate.params);
    const key = found?.key ?? `${method} ${path}`;
    const authorization = init.headers?.Authorization;
    const request = {
      key,
      method,
      path,
      params: found?.params ?? {},
      query: Object.fromEntries(url.searchParams),
      body: readBody(init.body),
      token: authorization ? authorization.replace('Bearer ', '') : null,
    };
    requests.push(request);

    if (failures.has(key)) {
      const failure = failures.get(key);
      failures.delete(key);
      return toResponse(failure);
    }
    if (!found) {
      // Rota que o teste esqueceu de responder: o erro aparece na tela e
      // na mensagem da falha, com a rota pedida.
      return toResponse(
        apiFailure(
          501,
          'TEST_UNHANDLED_ROUTE',
          `Rota sem resposta no teste: ${key}`,
        ),
      );
    }
    return toResponse(await routes[key](request));
  });

  current = {
    requests,
    last: (routeKey) =>
      requests.filter((request) => request.key === routeKey).at(-1),
    use: (more) => {
      routes = { ...routes, ...more };
    },
    fail: (
      routeKey,
      failure = apiFailure(
        500,
        'INTERNAL_ERROR',
        'Não foi possível concluir a operação. Tente novamente.',
      ),
    ) => {
      failures.set(routeKey, failure);
    },
  };
  return current;
}

/** Controle do stub em uso no teste atual (instalado pelo `setup.js`). */
export function apiStub() {
  return current;
}

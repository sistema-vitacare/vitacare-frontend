// Respostas simuladas no formato da API do vitacare-backend. Os serviços usam
// estas funções enquanto não há integração; depois, o cliente HTTP produz os
// mesmos objetos, e páginas e hooks não mudam.

// Nos testes não há espera; no navegador, o atraso deixa os estados de
// carregamento visíveis, como numa rede real.
const DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 350;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Erro com os campos do corpo `{ error }` da API. */
export class ApiError extends Error {
  constructor({ status, code, message, detail = null, fields = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fields = fields;
  }
}

// `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost); a
// versão simulada publicada em `http://IP:porta` quebraria com ele.
let requestCounter = 0;

function buildMeta(extra = {}) {
  requestCounter += 1;
  return {
    requestId: `simulado-${Date.now()}-${requestCounter}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/** Resposta de sucesso; `meta` acrescenta campos, como a `message` da API. */
export function respond(data, meta = {}) {
  return { data, meta: buildMeta(meta) };
}

export function paginate(
  items,
  { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {},
) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: buildMeta({
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
      },
    }),
  };
}

export function validationError(fields) {
  return new ApiError({
    status: 422,
    code: 'VALIDATION_FAILED',
    message: 'Alguns campos precisam ser corrigidos.',
    fields,
  });
}

export function notFoundError(message) {
  return new ApiError({ status: 404, code: 'NOT_FOUND', message });
}

function serverError() {
  return new ApiError({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Não foi possível concluir a operação. Tente novamente.',
  });
}

let pendingFailure = null;

/** Faz a próxima requisição simulada falhar, para exercitar o estado de erro. */
export function failNextRequest(error = serverError()) {
  pendingFailure = error;
}

// Serviços com estado próprio (bloqueio de login, senha trocada) registram
// aqui como voltar ao início, para que um teste não herde o estado do outro.
const stateResets = new Set();

export function registerMockState(reset) {
  stateResets.add(reset);
}

export function resetMockState() {
  pendingFailure = null;
  stateResets.forEach((reset) => reset());
}

export async function mockRequest(handler) {
  if (DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
  if (pendingFailure) {
    const error = pendingFailure;
    pendingFailure = null;
    throw error;
  }
  return handler();
}

/**
 * Confere a permissão da sessão como o guard da API: sem sessão, `401`; sem
 * a permissão, `403`. `viewer` é a sessão simulada de `currentViewer()`.
 */
export function requirePermission(viewer, permission) {
  if (!viewer) {
    throw new ApiError({
      status: 401,
      code: 'AUTH_UNAUTHENTICATED',
      message: 'Sessão inválida ou expirada.',
    });
  }
  if (!viewer.permissions.includes(permission)) {
    throw new ApiError({
      status: 403,
      code: 'AUTH_FORBIDDEN',
      message: 'Você não tem permissão para esta ação.',
    });
  }
}

// Cliente HTTP da API do vitacare-backend (manual da API, seções "Contrato
// transversal" e "Guia de integração dos clientes"). Os serviços chamam as
// rotas por aqui e recebem `{ data, meta }` ou um `ApiError`, os mesmos
// objetos dos serviços simulados; por isso páginas e hooks não mudam.
import { apiErrorMessages } from '../data/apiErrors.js';
import { apiOrigin } from '../utils/runtimeConfig.js';

const API_PATH = '/api/v1';
const TERMS_ACCEPTANCE_REQUIRED = 'TERMS_ACCEPTANCE_REQUIRED';

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

// A sessão registra aqui como ler o token e o que fazer quando a API encerra
// a sessão ou exige o termo; o cliente não importa a sessão, que importa o
// cliente.
let session = {
  getToken: () => null,
  onUnauthorized: () => {},
  onTermsRequired: () => {},
};

export function configureApiSession(handlers) {
  session = { ...session, ...handlers };
}

function buildUrl(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    // Parâmetro vazio responde 422 na API; ausente vale o padrão dela.
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const search = params.toString();
  return `${apiOrigin()}${API_PATH}${path}${search ? `?${search}` : ''}`;
}

function unexpected(status) {
  return new ApiError({
    status,
    code: 'HTTP_ERROR',
    message: apiErrorMessages.unexpected,
  });
}

async function readJson(response) {
  const text = await response.text();
  if (text === '') {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function send(
  method,
  path,
  { query, body, auth = true, token: ownToken, headers = {} },
) {
  // O Sair leva o token que a sessão acabou de soltar; o 401 dele não é
  // sessão vencida, porque a sessão já terminou na tela.
  const fromSession = !ownToken && auth;
  const token = ownToken ?? (fromSession ? session.getToken() : null);
  const finalHeaders = { Accept: 'application/json', ...headers };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }
  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body,
    });
    return { response, sentToken: fromSession && Boolean(token) };
  } catch {
    // Sem resposta (rede, CORS ou servidor fora do ar), não há corpo da API.
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: apiErrorMessages.network,
    });
  }
}

async function failure(response, sentToken) {
  const payload = await readJson(response);
  const error = payload?.error
    ? new ApiError({ status: response.status, ...payload.error })
    : unexpected(response.status);
  // O login responde 401 à credencial errada sem que houvesse sessão; só o
  // 401 de uma chamada com token quer dizer que a sessão acabou.
  if (response.status === 401 && sentToken) {
    session.onUnauthorized(error);
  }
  if (response.status === 403 && error.code === TERMS_ACCEPTANCE_REQUIRED) {
    session.onTermsRequired(error);
  }
  return error;
}

/** Chamada JSON: devolve `{ data, meta }` ou lança `ApiError`. */
export async function apiRequest(
  method,
  path,
  { query, body, auth, token } = {},
) {
  const json = body !== undefined;
  const { response, sentToken } = await send(method, path, {
    query,
    auth,
    token,
    body: json ? JSON.stringify(body) : undefined,
    headers: json ? { 'Content-Type': 'application/json' } : {},
  });
  if (!response.ok) {
    throw await failure(response, sentToken);
  }
  const payload = await readJson(response);
  if (payload === undefined) {
    throw unexpected(response.status);
  }
  // A remoção de anexo responde 204, sem corpo.
  return payload ?? { data: null, meta: {} };
}

export const apiGet = (path, query, options) =>
  apiRequest('GET', path, { ...options, query });
export const apiPost = (path, body, options) =>
  apiRequest('POST', path, { ...options, body });
export const apiPut = (path, body, options) =>
  apiRequest('PUT', path, { ...options, body });
export const apiPatch = (path, body, options) =>
  apiRequest('PATCH', path, { ...options, body });
export const apiDelete = (path, options) => apiRequest('DELETE', path, options);

/**
 * Nome do arquivo em `Content-Disposition`. A forma codificada
 * (`filename*=UTF-8''...`) vence a simples, como nos navegadores.
 */
function fileNameFrom(header) {
  if (!header) {
    return null;
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    return decodeURIComponent(encoded[1].trim());
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/**
 * Arquivo gerado pela API (PDF, CSV e anexo), com o Bearer: o link direto
 * não funciona, porque a rota exige o token. Devolve `{ data: { blob,
 * fileName } }`, o formato dos serviços simulados.
 */
export async function apiDownload(path, query) {
  const { response, sentToken } = await send('GET', path, { query });
  if (!response.ok) {
    throw await failure(response, sentToken);
  }
  return {
    data: {
      blob: await response.blob(),
      fileName: fileNameFrom(response.headers.get('Content-Disposition')),
    },
    meta: {},
  };
}

/**
 * Envio de um arquivo em `multipart/form-data`, na parte `file`. O
 * navegador monta o `Content-Type` com o separador das partes; fixá-lo aqui
 * quebraria o envio.
 */
export async function apiUpload(path, file) {
  const form = new FormData();
  form.append('file', file);
  const { response, sentToken } = await send('POST', path, { body: form });
  if (!response.ok) {
    throw await failure(response, sentToken);
  }
  return (await readJson(response)) ?? { data: null, meta: {} };
}

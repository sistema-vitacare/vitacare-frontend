// O que sobrou da camada simulada, até o FE-65 do INTEGRACAO.md: o envelope
// `{ data, meta }` que os testes dos hooks montam com `respond`, o `ApiError`
// do cliente HTTP e a volta ao início do estado guardado em módulo (a sessão
// do `authService`) entre os testes. Nenhum serviço responde mais com dados
// simulados.

import { ApiError } from './apiClient.js';

export { ApiError };

// `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost).
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

// Módulos com estado próprio registram aqui como voltar ao início, para que
// um teste não herde o estado do outro.
const stateResets = new Set();

export function registerMockState(reset) {
  stateResets.add(reset);
}

export function resetMockState() {
  stateResets.forEach((reset) => reset());
}

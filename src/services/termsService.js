// Termo de uso e privacidade (manual da API, `terms-vigente.md` e
// `terms-aceitar.md`, conferido em 19/11/2026 no commit `3beebe3` do
// backend). Sem o aceite da versão vigente, a API recusa as outras rotas com
// `403 TERMS_ACCEPTANCE_REQUIRED`.
import { apiGet, apiPost } from './apiClient.js';

export const TERMS_ERRORS = Object.freeze({
  // Saiu uma versão nova enquanto a pessoa lia: o texto é lido de novo.
  VERSION_NOT_CURRENT: 'TERMS_VERSION_NOT_CURRENT',
});

/** Texto vigente, em Markdown; a rota é pública. */
export function getCurrentTerms() {
  return apiGet('/terms/current', undefined, { auth: false });
}

/** Aceite da versão exibida, para ninguém aceitar um texto que não leu. */
export function acceptTerms(version) {
  return apiPost('/terms/acceptances', { version });
}

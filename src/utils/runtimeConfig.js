/**
 * Origem da API (`https://api.vitacare.bizys.com.br`, sem `/` no fim), lida
 * do `/config.js` que o nginx gera com a `API_URL` da stack. Ela não entra no
 * build: a mesma imagem serve qualquer ambiente (`docs/deploy-vps.md`). No
 * navegador, `globalThis` é o `window` em que o `/config.js` escreve; fora
 * dele (testes de regras no ambiente `node`), a leitura não quebra.
 */
export function apiOrigin() {
  return globalThis.__VITACARE_CONFIG__?.apiUrl ?? '';
}

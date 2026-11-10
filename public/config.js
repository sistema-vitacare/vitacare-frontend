// Configuração lida em tempo de execução, antes do app. Este arquivo vale só
// no desenvolvimento (`npm run dev`): em produção o nginx responde /config.js
// com a API_URL da stack, e a mesma imagem serve qualquer ambiente sem rebuild.
window.__VITACARE_CONFIG__ = Object.freeze({
  apiUrl: 'http://localhost:3000',
});

import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { stubApi } from './support/apiStub.js';
import { sessionHandlers } from './support/fixtures/sessions.js';

// A primeira renderização de uma tela com tabela ou gráfico leva mais de 1 s
// numa máquina carregada, e o padrão da Testing Library desiste de esperar
// em 1 s: o teste falharia por lentidão, não por erro. Uma tela que nunca
// aparece continua falhando, só que depois de 5 s.
configure({ asyncUtilTimeout: 5000 });

// Sem os globais do Vitest, a Testing Library não desmonta os componentes
// sozinha; o que um teste renderiza vazaria para o teste seguinte.
afterEach(() => {
  cleanup();
});

// Nenhum teste chama a API real: o `fetch` responde pelo stub, que já sabe
// o login e o Sair dos usuários de demonstração; cada teste acrescenta as
// rotas da tela dele com `apiStub().use(...)`.
// Os testes de regras puras rodam no ambiente `node`, sem `window`.
const browser = typeof window !== 'undefined';

beforeEach(() => {
  globalThis.__VITACARE_CONFIG__ = { apiUrl: 'http://api.test' };
  stubApi(sessionHandlers());
});

// A sessão guardada no `sessionStorage` passaria de um teste para o outro.
afterEach(() => {
  if (browser) {
    window.sessionStorage.clear();
  }
  vi.unstubAllGlobals();
});

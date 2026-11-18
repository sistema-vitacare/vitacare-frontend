// As telas do roteador chegam por import dinâmico (`src/lazyPages.js`). Sem
// carregar os módulos antes, o primeiro teste que abre cada tela paga a
// importação dela dentro da espera de 5 s da Testing Library (tests/setup.js)
// e, numa máquina carregada, falha por lentidão, não por erro. Com os módulos
// já carregados, o `lazy` só espera uma promessa resolvida.
export function preloadPages() {
  return Promise.all(
    Object.values(import.meta.glob('../../src/pages/**/*Page.jsx')).map(
      (load) => load(),
    ),
  );
}

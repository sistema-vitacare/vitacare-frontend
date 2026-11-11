import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

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

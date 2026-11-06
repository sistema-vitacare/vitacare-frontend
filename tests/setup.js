import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem os globais do Vitest, a Testing Library não desmonta os componentes
// sozinha; o que um teste renderiza vazaria para o teste seguinte.
afterEach(() => {
  cleanup();
});

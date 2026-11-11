import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    // Um teste com várias esperas de até 5 s (tests/setup.js) estouraria o
    // limite padrão de 5 s por teste.
    testTimeout: 20000,
  },
});

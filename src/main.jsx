import '@fontsource-variable/plus-jakarta-sans';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import SessionProvider from './components/SessionProvider.jsx';
import { theme } from './styles/theme.js';
import { reloadAfterDeploy } from './utils/reloadAfterDeploy.js';

// O Vite avisa por este evento quando o arquivo de uma tela não carrega, como
// depois de um deploy que trocou os arquivos.
window.addEventListener('vite:preloadError', () => reloadAfterDeploy());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SessionProvider>
        <App />
      </SessionProvider>
    </ThemeProvider>
  </StrictMode>,
);

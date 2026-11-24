import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import { resourceStateContent } from '../data/patientFields.js';

// Exportada à parte porque o roteador também a mostra enquanto o arquivo de
// uma tela chega.
export function LoadingBar() {
  return (
    <Box sx={{ py: 4 }}>
      <LinearProgress aria-label="Carregando" />
    </Box>
  );
}

/**
 * Mostra o estado de um `useResource`: barra de carregamento, erro com nova
 * tentativa, texto de lista vazia ou o conteúdo. `children` recebe os dados
 * e só é chamado no sucesso.
 */
export default function ResourceState({
  resource,
  emptyText,
  errorText = resourceStateContent.error,
  children,
}) {
  if (resource.status === 'loading') {
    return <LoadingBar />;
  }
  // O 422 é um limite ou um filtro inválido: a mensagem da API diz o que
  // mudar, e tentar de novo falharia igual.
  if (resource.status === 'error' && resource.error?.status === 422) {
    return <Alert severity="error">{resource.error.message}</Alert>;
  }
  if (resource.status === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={resource.retry}>
            {resourceStateContent.retry}
          </Button>
        }
      >
        {errorText}
      </Alert>
    );
  }
  if (resource.status === 'empty') {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        {resource.meta?.message ?? emptyText}
      </Typography>
    );
  }
  return children(resource.data, resource.meta);
}

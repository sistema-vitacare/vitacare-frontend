import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import { resourceStateContent } from '../data/patientFields.js';

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
    return (
      <Box sx={{ py: 4 }}>
        <LinearProgress aria-label="Carregando" />
      </Box>
    );
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
        {emptyText}
      </Typography>
    );
  }
  return children(resource.data, resource.meta);
}

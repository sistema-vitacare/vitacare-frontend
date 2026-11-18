import { Alert, Button, Stack } from '@mui/material';
import { FilePdf } from '@phosphor-icons/react';
import { useSubmit } from '../../hooks/useSubmit.js';
import { saveFile } from '../../utils/saveFile.js';

/**
 * "Exportar PDF" dos relatórios: o serviço devolve o arquivo e o nome que a
 * API dá a ele, e a tela entrega ao navegador. A falha mostra o erro com
 * nova tentativa; `onExported` avisa a página, que atualiza os recentes.
 */
export default function ExportPdfButton({ action, labels, onExported }) {
  const { status, submit } = useSubmit(action);

  async function exportPdf() {
    const { data } = await submit();
    if (data) {
      saveFile(data.blob, data.fileName);
      onExported?.();
    }
  }

  return (
    <Stack spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
      <Button
        variant="contained"
        onClick={exportPdf}
        loading={status === 'submitting'}
        startIcon={<FilePdf size={18} aria-hidden="true" />}
      >
        {labels.exportPdf}
      </Button>
      {status === 'error' ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={exportPdf}>
              {labels.retry}
            </Button>
          }
        >
          {labels.exportError}
        </Alert>
      ) : null}
    </Stack>
  );
}

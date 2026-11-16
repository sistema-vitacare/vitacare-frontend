import { Alert, Button, Stack, TextField } from '@mui/material';
import { Copy } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { temporaryPasswordContent as content } from '../data/temporaryPassword.js';

/**
 * Copia a senha. Pelo IP sem HTTPS, o navegador não oferece
 * `navigator.clipboard` (fora de contexto seguro), e, mesmo com ele, pode
 * recusar a escrita sem permissão; nos dois casos a senha é copiada do campo
 * selecionado, que é o que ainda funciona.
 */
async function copyPassword(password, input) {
  try {
    await navigator.clipboard.writeText(password);
    return true;
  } catch {
    input?.select();
    return document.execCommand?.('copy') === true;
  }
}

/**
 * Senha provisória que a API devolve uma única vez, só para leitura e com
 * Copiar. Quem mostra decide o texto em volta (para quem entregar e até
 * quando vale).
 */
export default function TemporaryPasswordField({ password }) {
  const inputRef = useRef(null);
  const [copy, setCopy] = useState(null);

  async function handleCopy() {
    const copied = await copyPassword(password, inputRef.current);
    setCopy(copied ? 'copied' : 'failed');
  }

  return (
    <Stack spacing={2}>
      {/* No celular, o botão desce para a senha caber inteira. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          label={content.label}
          value={password}
          inputRef={inputRef}
          fullWidth
          slotProps={{
            htmlInput: {
              readOnly: true,
              spellCheck: false,
              sx: { fontFamily: 'monospace' },
            },
          }}
        />
        <Button
          variant="outlined"
          onClick={handleCopy}
          startIcon={<Copy size={18} aria-hidden="true" />}
        >
          {content.copy}
        </Button>
      </Stack>
      {copy ? (
        <Alert severity={copy === 'copied' ? 'success' : 'warning'}>
          {copy === 'copied' ? content.copied : content.copyFailed}
        </Alert>
      ) : null}
    </Stack>
  );
}

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Copy } from '@phosphor-icons/react';
import { useId, useRef, useState } from 'react';
import { invitationResultContent as content } from '../../data/userPages.js';
import { formatMessageDateTime } from '../../utils/format.js';

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
 * Resultado de um convite ou de uma senha provisória, mostrado uma única
 * vez: a senha não fica no estado da tela depois de fechar. No convite por
 * e-mail, a API não devolve senha, só a mensagem do envio.
 */
export default function InvitationResultDialog({ outcome, userName, onClose }) {
  const titleId = useId();
  const inputRef = useRef(null);
  const [copy, setCopy] = useState(null);
  const { data, meta } = outcome;
  const password = data.temporaryPassword;

  async function handleCopy() {
    const copied = await copyPassword(password, inputRef.current);
    setCopy(copied ? 'copied' : 'failed');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id={titleId}>
        {password ? content.passwordTitle : content.emailTitle}
      </DialogTitle>
      <DialogContent>
        {password ? (
          <Stack spacing={2}>
            <Typography variant="body2">
              {content.passwordIntro(userName)}
            </Typography>
            {/* No celular, o botão desce para a senha caber inteira. */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <TextField
                label={content.passwordLabel}
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
            <Typography variant="body2" color="text.secondary">
              {content.validUntil(formatMessageDateTime(data.expiresAt))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {content.onlyOnce}
            </Typography>
          </Stack>
        ) : (
          <Alert
            severity={
              data.delivery?.status === 'failed' ? 'warning' : 'success'
            }
          >
            {meta?.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {content.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

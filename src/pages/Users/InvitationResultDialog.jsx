import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useId } from 'react';
import TemporaryPasswordField from '../../components/TemporaryPasswordField.jsx';
import { invitationResultContent as content } from '../../data/userPages.js';
import { formatMessageDateTime } from '../../utils/format.js';

/**
 * Resultado de um convite ou de uma senha provisória, mostrado uma única
 * vez: a senha não fica no estado da tela depois de fechar. No convite por
 * e-mail, a API não devolve senha, só a mensagem do envio.
 */
export default function InvitationResultDialog({ outcome, userName, onClose }) {
  const titleId = useId();
  const { data, meta } = outcome;
  const password = data.temporaryPassword;

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
            <TemporaryPasswordField password={password} />
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

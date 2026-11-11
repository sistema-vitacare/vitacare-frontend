import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useId } from 'react';
import { confirmDialogContent } from '../data/patientFields.js';

/**
 * Pede confirmação antes de uma ação que muda a situação de um registro
 * (inativar, reativar, revogar). Enquanto `pending`, os botões travam para
 * a ação não sair duas vezes; `error` mostra a falha sem fechar o diálogo.
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  tone = 'primary',
  pending = false,
  error = null,
  onConfirm,
  onClose,
}) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          {confirmDialogContent.cancel}
        </Button>
        <Button
          variant="contained"
          color={tone}
          onClick={onConfirm}
          loading={pending}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

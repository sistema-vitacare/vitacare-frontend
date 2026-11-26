import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useId, useState } from 'react';
import {
  planTermFieldErrors,
  rejectRequestContent as content,
} from '../../data/organizationPlanPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  PLAN_REQUEST_STALE_CODES,
  rejectChangeRequest,
} from '../../services/organizationService.js';
import { decisionNoteError } from '../../utils/planTerm.js';

const messages = planTermFieldErrors.note;

/**
 * Recusa da solicitação de mudança de plano (UC04), com a justificativa que
 * a API exige e que a organização vê. A solicitação decidida ou cancelada
 * nesse meio-tempo chega a `onStale` com a mensagem da API.
 */
export default function RejectRequestDialog({
  request,
  onClose,
  onRejected,
  onStale,
}) {
  const titleId = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const action = useCallback(
    (decisionNote) => rejectChangeRequest(request.id, { decisionNote }),
    [request.id],
  );
  const { status, submit } = useSubmit(action);
  const pending = status === 'submitting';

  async function handleSubmit(event) {
    event.preventDefault();
    const code = decisionNoteError(note);
    if (code) {
      setError(code);
      return;
    }
    const outcome = await submit(note.trim());
    if (outcome.data) {
      onRejected();
      return;
    }
    if (PLAN_REQUEST_STALE_CODES.includes(outcome.error.code)) {
      onStale(outcome.error.message);
      return;
    }
    const field = outcome.error.fields?.find(
      (item) => item.field === 'decisionNote',
    );
    if (field) {
      setError(field.code);
      return;
    }
    setFormError(
      outcome.error.status === 409 ? outcome.error.message : content.unexpected,
    );
  }

  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'contents' }}
      >
        <DialogTitle id={titleId}>{content.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {content.intro}
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label={content.decisionNote}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setError(null);
                setFormError(null);
              }}
              required
              multiline
              minRows={3}
              fullWidth
              error={Boolean(error)}
              helperText={
                error
                  ? (messages[error] ?? messages.default)
                  : content.noteHelper
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            {content.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            loading={pending}
          >
            {content.reject}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

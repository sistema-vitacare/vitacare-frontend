import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useCallback, useId, useState } from 'react';
import { TENANT_PROFILES } from '../../constants/users.js';
import { profileLabels } from '../../data/profiles.js';
import { profileDialogContent as content } from '../../data/userPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { changeUserProfile } from '../../services/userService.js';

/**
 * Troca de perfil, com o aviso de que a API revoga os vínculos de cuidado
 * que não combinam com o perfil novo (BE-10).
 */
export default function ProfileDialog({ user, onClose, onSaved }) {
  const titleId = useId();
  const [profileCode, setProfileCode] = useState(user.profile.code);
  const action = useCallback(
    (code) => changeUserProfile(user.id, { profileCode: code }),
    [user.id],
  );
  const { status, error, submit } = useSubmit(action);
  const pending = status === 'submitting';

  async function save(event) {
    event.preventDefault();
    const outcome = await submit(profileCode);
    if (outcome.data) {
      onSaved(outcome.data);
    }
  }

  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <Box
        component="form"
        noValidate
        onSubmit={save}
        sx={{ display: 'contents' }}
      >
        <DialogTitle id={titleId}>{content.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label={content.profile}
              value={profileCode}
              onChange={(event) => setProfileCode(event.target.value)}
              fullWidth
            >
              {TENANT_PROFILES.map((code) => (
                <MenuItem key={code} value={code}>
                  {profileLabels[code]}
                </MenuItem>
              ))}
            </TextField>
            <Alert severity="warning">{content.warning}</Alert>
            {error ? (
              <Alert severity="error">
                {error.message ?? content.unexpected}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            {content.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={pending}
            disabled={profileCode === user.profile.code}
          >
            {content.save}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

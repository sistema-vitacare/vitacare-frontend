import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId, useState } from 'react';
import {
  accessErrors,
  changePasswordContent as content,
} from '../data/access.js';
import { useAccessForm } from '../hooks/useAccessForm.js';
import { useSession } from '../hooks/useSession.js';
import { AUTH_ERRORS } from '../services/authService.js';
import {
  fieldErrorsFromApi,
  validateConfirmation,
  validatePassword,
} from '../utils/authValidation.js';
import PasswordField from './PasswordField.jsx';

const validators = {
  currentPassword: validatePassword,
  newPassword: validatePassword,
  confirmation: (value, values) =>
    validateConfirmation(values.newPassword, value),
};

/**
 * Troca da própria senha (RF001, UC01), aberta pelo menu do usuário em
 * qualquer perfil. Concluída a troca, a API encerra todas as sessões da
 * conta, e o login abre com o aviso; por isso o diálogo não fecha sozinho.
 */
export default function ChangePasswordDialog({ onClose }) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { changePassword } = useSession();
  const { values, setErrors, check, fieldProps } = useAccessForm(
    { currentPassword: '', newPassword: '', confirmation: '' },
    validators,
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!check(event.currentTarget)) {
      return;
    }
    setPending(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    } catch (error) {
      setPending(false);
      if (error.code === AUTH_ERRORS.CURRENT_PASSWORD_INVALID) {
        setErrors({ currentPassword: 'wrong' });
      } else if (error.code === AUTH_ERRORS.PASSWORD_REUSE) {
        setErrors({ newPassword: 'sameAsCurrent' });
      } else if (error.status === 422) {
        setErrors(fieldErrorsFromApi(error));
      } else if (error.code !== AUTH_ERRORS.UNAUTHENTICATED) {
        setFormError(accessErrors.unexpected);
      }
    }
  }

  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      maxWidth="xs"
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
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {content.intro}
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <PasswordField
              {...fieldProps('currentPassword')}
              autoComplete="current-password"
            />
            <PasswordField
              {...fieldProps('newPassword')}
              autoComplete="new-password"
            />
            <PasswordField
              {...fieldProps('confirmation')}
              autoComplete="new-password"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            {content.cancel}
          </Button>
          <Button type="submit" variant="contained" loading={pending}>
            {content.submit}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

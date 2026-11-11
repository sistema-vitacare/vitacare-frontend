import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Navigate } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import { PATHS, homePath } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { firstAccessContent } from '../../data/firstAccess.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useSession } from '../../hooks/useSession.js';
import { AUTH_ERRORS } from '../../services/authService.js';
import {
  fieldErrorsFromApi,
  validateConfirmation,
  validatePassword,
} from '../../utils/authValidation.js';

const validators = {
  newPassword: validatePassword,
  confirmation: (value, values) =>
    validateConfirmation(values.newPassword, value),
};

/**
 * Troca obrigatória da senha provisória (UC01 e UC03): usuário convidado,
 * administrador recém-criado ou quem teve a senha redefinida. A sessão
 * restrita da API só alcança esta troca e o Sair.
 */
export default function FirstAccessPage() {
  const { status, session, can, completeFirstAccess, signOut } = useSession();
  const { values, setErrors, check, fieldProps } = useAccessForm(
    { newPassword: '', confirmation: '' },
    validators,
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(null);

  // Concluída a troca, a sessão volta a `anonymous` com o aviso para o login;
  // vencida, passa a `expired`. Nos dois casos, o login assume.
  if (status === 'authenticated') {
    return <Navigate to={homePath(can) ?? PATHS.HOME} replace />;
  }
  if (status !== 'restricted') {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!check(event.currentTarget)) {
      return;
    }
    setPending(true);
    try {
      await completeFirstAccess(values.newPassword);
    } catch (error) {
      setPending(false);
      if (error.code === AUTH_ERRORS.PASSWORD_REUSE) {
        setErrors({ newPassword: 'reuse' });
      } else if (error.status === 422) {
        setErrors(fieldErrorsFromApi(error));
      } else if (error.code !== AUTH_ERRORS.UNAUTHENTICATED) {
        setFormError(accessErrors.unexpected);
      }
    }
  }

  return (
    <AuthLayout
      title={firstAccessContent.title}
      subtitle={firstAccessContent.subtitle}
    >
      <Stack spacing={2.5}>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {firstAccessContent.accountLabel}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>{session.user.name}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {session.user.email} · {session.organization.tradeName}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {firstAccessContent.deadline}
        </Typography>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        <Stack
          component="form"
          spacing={2.5}
          noValidate
          onSubmit={handleSubmit}
        >
          <PasswordField
            {...fieldProps('newPassword')}
            autoComplete="new-password"
          />
          <PasswordField
            {...fieldProps('confirmation')}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            loading={pending}
          >
            {firstAccessContent.submit}
          </Button>
        </Stack>
        <Button variant="text" onClick={signOut} disabled={pending}>
          {firstAccessContent.signOut}
        </Button>
      </Stack>
    </AuthLayout>
  );
}

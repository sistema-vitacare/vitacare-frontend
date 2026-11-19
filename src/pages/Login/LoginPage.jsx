import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { Navigate, Link as RouterLink, useLocation } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import { PATHS, homePath } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { loginContent } from '../../data/login.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useSession } from '../../hooks/useSession.js';
import { AUTH_ERRORS } from '../../services/authService.js';
import {
  fieldErrorsFromApi,
  validateEmail,
  validateOrganizationCode,
  validatePassword,
} from '../../utils/authValidation.js';

const validators = {
  organizationCode: validateOrganizationCode,
  email: validateEmail,
  password: validatePassword,
};

/** Entrada no sistema: código da organização, e-mail e senha (UC01). */
export default function LoginPage() {
  const {
    status,
    notice: sessionNotice,
    can,
    signInWithPassword,
  } = useSession();
  const location = useLocation();
  // Depois de uma troca de senha, o aviso vem da sessão; depois do aceite do
  // convite, da página do convite, que não tem sessão. Nos dois casos, a API
  // exige login com a senha nova, e código e e-mail já vêm preenchidos.
  const notice = sessionNotice ?? location.state?.notice ?? null;
  const { values, setValues, setErrors, check, fieldProps } = useAccessForm(
    {
      organizationCode: notice?.organizationCode ?? '',
      email: notice?.email ?? '',
      password: '',
    },
    validators,
  );
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  // Quem já entrou não fica no login. Isso também leva adiante logo depois
  // da entrada, quando a sessão muda de estado.
  if (status === 'authenticated') {
    return <Navigate to={homePath(can) ?? PATHS.HOME} replace />;
  }
  if (status === 'restricted') {
    return <Navigate to={PATHS.FIRST_ACCESS} replace />;
  }
  if (status === 'terms') {
    return <Navigate to={PATHS.TERMS} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!check(event.currentTarget)) {
      return;
    }

    setPending(true);
    try {
      await signInWithPassword(values);
    } catch (error) {
      setPending(false);
      if (error.code === AUTH_ERRORS.INVALID_CREDENTIALS) {
        setFormError(loginContent.invalidCredentials);
        setValues((current) => ({ ...current, password: '' }));
      } else if (error.code === AUTH_ERRORS.TEMPORARILY_BLOCKED) {
        setFormError(loginContent.blocked);
      } else if (error.status === 422) {
        setErrors(fieldErrorsFromApi(error));
      } else {
        setFormError(accessErrors.unexpected);
      }
    }
  }

  return (
    <AuthLayout title={loginContent.title} subtitle={loginContent.subtitle}>
      <Stack spacing={2.5}>
        {status === 'expired' ? (
          <Alert severity="info">{loginContent.expired}</Alert>
        ) : null}
        {notice?.kind === 'passwordChanged' ? (
          <Alert severity="success">{loginContent.passwordChanged}</Alert>
        ) : null}
        {notice?.kind === 'invitationAccepted' ? (
          <Alert severity="success">{notice.message}</Alert>
        ) : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Stack
          component="form"
          spacing={2.5}
          noValidate
          onSubmit={handleSubmit}
        >
          <TextField
            {...fieldProps('organizationCode')}
            autoComplete="organization"
          />
          <TextField
            {...fieldProps('email')}
            type="email"
            autoComplete="username"
          />
          <PasswordField
            {...fieldProps('password')}
            autoComplete="current-password"
          />
          <Link
            component={RouterLink}
            to={PATHS.PASSWORD_RECOVERY}
            underline="hover"
            variant="body2"
            sx={{ alignSelf: 'flex-end', fontWeight: 600 }}
          >
            {loginContent.forgotPassword}
          </Link>
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            loading={pending}
          >
            {loginContent.submit}
          </Button>
        </Stack>
      </Stack>
    </AuthLayout>
  );
}

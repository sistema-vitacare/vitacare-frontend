import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import { PATHS, homePath } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { demoCredentials, loginContent } from '../../data/login.js';
import { profileLabels } from '../../data/profiles.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useSession } from '../../hooks/useSession.js';
import { AUTH_ERRORS, DEMO_PROFILES } from '../../services/authService.js';
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

/**
 * Entrada no sistema: código da organização, e-mail e senha (UC01) e, no
 * modo de dados simulados, os atalhos de demonstração.
 */
export default function LoginPage() {
  const { status, notice, can, signIn, signInWithPassword } = useSession();
  // Depois do primeiro acesso, a API exige login com a senha nova; código e
  // e-mail já vêm preenchidos.
  const { values, setValues, setErrors, check, fieldProps } = useAccessForm(
    {
      organizationCode: notice?.organizationCode ?? '',
      email: notice?.email ?? '',
      password: '',
    },
    validators,
  );
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(null);

  // Quem já entrou não fica no login. Isso também leva adiante logo depois
  // da entrada, quando a sessão muda de estado.
  if (status === 'authenticated') {
    return <Navigate to={homePath(can) ?? PATHS.HOME} replace />;
  }
  if (status === 'restricted') {
    return <Navigate to={PATHS.FIRST_ACCESS} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!check(event.currentTarget)) {
      return;
    }

    setPending('form');
    try {
      await signInWithPassword(values);
    } catch (error) {
      setPending(null);
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

  async function handleDemo(profileCode) {
    setPending(profileCode);
    setFormError(null);
    try {
      await signIn(profileCode);
    } catch {
      setFormError(loginContent.demoError);
      setPending(null);
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
            loading={pending === 'form'}
            disabled={pending !== null && pending !== 'form'}
          >
            {loginContent.submit}
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Box component="section" aria-labelledby="demo-title">
        <Typography
          id="demo-title"
          variant="subtitle2"
          component="h2"
          gutterBottom
        >
          {loginContent.demoTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {loginContent.demoText}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1,
          }}
        >
          {DEMO_PROFILES.map((code) => (
            <Button
              key={code}
              variant="outlined"
              disabled={pending !== null}
              onClick={() => handleDemo(code)}
            >
              {profileLabels[code]}
            </Button>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
          {loginContent.demoFormText}
        </Typography>
        <Box component="dl" sx={{ m: 0, mt: 1 }}>
          {demoCredentials.map(({ label, value }) => (
            <Box key={label} sx={{ mt: 1 }}>
              <Typography
                component="dt"
                variant="caption"
                color="text.secondary"
              >
                {label}
              </Typography>
              <Typography
                component="dd"
                variant="body2"
                sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </AuthLayout>
  );
}

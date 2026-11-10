import { Alert, Button, Link, Stack } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import { PATHS } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { resetContent } from '../../data/passwordRecovery.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { AUTH_ERRORS, resetPassword } from '../../services/authService.js';
import {
  validateConfirmation,
  validatePassword,
} from '../../utils/authValidation.js';

const validators = {
  newPassword: validatePassword,
  confirmation: (value, values) =>
    validateConfirmation(values.newPassword, value),
};

function ActionLink({ to, children }) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="hover"
      variant="body2"
      sx={{ alignSelf: 'center', fontWeight: 600 }}
    >
      {children}
    </Link>
  );
}

/**
 * Nova senha definida pelo link do e-mail de recuperação (UC02). O token vem
 * no endereço e vale uma vez, por 15 minutos; inválido, vencido ou já usado,
 * a API responde do mesmo jeito, e a tela orienta a pedir outro link.
 */
export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { values, check, fieldProps } = useAccessForm(
    { newPassword: '', confirmation: '' },
    validators,
  );
  const { status, error, submit } = useSubmit(resetPassword);

  function handleSubmit(event) {
    event.preventDefault();
    if (check(event.currentTarget)) {
      submit({ token, newPassword: values.newPassword });
    }
  }

  const linkInvalid =
    token === '' || error?.code === AUTH_ERRORS.RESET_TOKEN_INVALID;

  let content;
  if (status === 'success') {
    content = (
      <>
        <Alert severity="success">{resetContent.success}</Alert>
        <ActionLink to={PATHS.LOGIN}>{resetContent.backToLogin}</ActionLink>
      </>
    );
  } else if (linkInvalid) {
    content = (
      <>
        <Alert severity="warning">{resetContent.invalidLink}</Alert>
        <ActionLink to={PATHS.PASSWORD_RECOVERY}>
          {resetContent.requestNewLink}
        </ActionLink>
      </>
    );
  } else {
    content = (
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {error ? (
          <Alert severity="error">{accessErrors.unexpected}</Alert>
        ) : null}
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
          loading={status === 'submitting'}
        >
          {resetContent.submit}
        </Button>
      </Stack>
    );
  }

  return (
    <AuthLayout title={resetContent.title} subtitle={resetContent.subtitle}>
      <Stack spacing={2.5}>{content}</Stack>
    </AuthLayout>
  );
}

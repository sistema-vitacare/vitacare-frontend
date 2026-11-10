import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import { PATHS } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { recoveryContent } from '../../data/passwordRecovery.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  AUTH_ERRORS,
  requestPasswordRecovery,
} from '../../services/authService.js';
import {
  validateEmail,
  validateOrganizationCode,
} from '../../utils/authValidation.js';

const validators = {
  organizationCode: validateOrganizationCode,
  email: validateEmail,
};

/**
 * Pedido de recuperação de senha (UC02). A resposta é a mesma exista ou não a
 * conta; a tela mostra a orientação que a API devolve, que depende de haver
 * servidor de e-mail.
 */
export default function PasswordRecoveryPage() {
  const { values, check, fieldProps } = useAccessForm(
    { organizationCode: '', email: '' },
    validators,
  );
  const { status, meta, error, submit } = useSubmit(requestPasswordRecovery);
  function handleSubmit(event) {
    event.preventDefault();
    if (check(event.currentTarget)) {
      submit(values);
    }
  }

  // A validação antes do envio é a mesma da API; o 422 não chega aqui.
  let formError = null;
  if (error) {
    formError =
      error.code === AUTH_ERRORS.TEMPORARILY_BLOCKED
        ? recoveryContent.blocked
        : accessErrors.unexpected;
  }

  return (
    <AuthLayout
      title={recoveryContent.title}
      subtitle={recoveryContent.subtitle}
    >
      <Stack spacing={2.5}>
        {status === 'success' ? (
          <Alert severity="info">{meta.message}</Alert>
        ) : (
          <Stack
            component="form"
            spacing={2.5}
            noValidate
            onSubmit={handleSubmit}
          >
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              {...fieldProps('organizationCode')}
              autoComplete="organization"
            />
            <TextField
              {...fieldProps('email')}
              type="email"
              autoComplete="username"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={status === 'submitting'}
            >
              {recoveryContent.submit}
            </Button>
          </Stack>
        )}
        <Link
          component={RouterLink}
          to={PATHS.LOGIN}
          underline="hover"
          variant="body2"
          sx={{ alignSelf: 'center', fontWeight: 600 }}
        >
          {recoveryContent.backToLogin}
        </Link>
      </Stack>
    </AuthLayout>
  );
}

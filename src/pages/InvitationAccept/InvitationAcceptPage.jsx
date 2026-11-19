import { Alert, Button, Link, Stack } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import DefinitionList from '../../components/DefinitionList.jsx';
import PasswordField from '../../components/PasswordField.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PATHS } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { invitationAcceptContent as content } from '../../data/invitationAccept.js';
import { profileLabels } from '../../data/profiles.js';
import { useAccessForm } from '../../hooks/useAccessForm.js';
import { useResource } from '../../hooks/useResource.js';
import {
  INVITATION_ERRORS,
  acceptInvitation,
  inspectInvitation,
} from '../../services/invitationService.js';
import {
  fieldErrorsFromApi,
  validateConfirmation,
  validatePassword,
} from '../../utils/authValidation.js';
import { formatMessageDateTime } from '../../utils/format.js';

const validators = {
  newPassword: validatePassword,
  confirmation: (value, values) =>
    validateConfirmation(values.newPassword, value),
};

function LoginLink() {
  return (
    <Link
      component={RouterLink}
      to={PATHS.LOGIN}
      underline="hover"
      variant="body2"
      sx={{ alignSelf: 'center', fontWeight: 600 }}
    >
      {content.backToLogin}
    </Link>
  );
}

function InvalidInvitation({ message }) {
  return (
    <>
      <Alert severity="warning">{message}</Alert>
      <LoginLink />
    </>
  );
}

function PasswordForm({ token, invitation }) {
  const navigate = useNavigate();
  const { values, setErrors, check, fieldProps } = useAccessForm(
    { newPassword: '', confirmation: '' },
    validators,
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [invalid, setInvalid] = useState(null);

  if (invalid) {
    return <InvalidInvitation message={invalid} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!check(event.currentTarget)) {
      return;
    }
    setPending(true);
    try {
      const { data, meta } = await acceptInvitation({
        token,
        newPassword: values.newPassword,
      });
      // O aceite não abre sessão: o login abre preenchido, com a mensagem da
      // API, e a pessoa entra com a senha que acabou de criar.
      navigate(PATHS.LOGIN, {
        replace: true,
        state: {
          notice: {
            kind: 'invitationAccepted',
            organizationCode: data.organizationCode,
            email: data.email,
            message: meta.message,
          },
        },
      });
    } catch (error) {
      setPending(false);
      if (error.code === INVITATION_ERRORS.INVALID) {
        setInvalid(error.message);
      } else if (error.status === 422) {
        setErrors(fieldErrorsFromApi(error));
      } else if (error.status === 429) {
        setFormError(error.message);
      } else {
        setFormError(accessErrors.unexpected);
      }
    }
  }

  return (
    <>
      <DefinitionList
        rows={[
          [content.name, invitation.user.name],
          [content.email, invitation.user.email],
          [content.organization, invitation.organization.name],
          [content.profile, profileLabels[invitation.profile.code]],
          [content.expiresAt, formatMessageDateTime(invitation.expiresAt)],
        ]}
      />
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
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
          {content.submit}
        </Button>
      </Stack>
    </>
  );
}

function Invitation({ token }) {
  const load = useCallback(() => inspectInvitation(token), [token]);
  const resource = useResource(load);

  if (
    resource.status === 'error' &&
    resource.error.code === INVITATION_ERRORS.INVALID
  ) {
    return <InvalidInvitation message={resource.error.message} />;
  }
  return (
    <ResourceState resource={resource}>
      {(invitation) => <PasswordForm token={token} invitation={invitation} />}
    </ResourceState>
  );
}

/**
 * Aceite do convite por link (UC03, passo 6; BE-31): com o SMTP ligado, o
 * convidado recebe o link desta página e cria a própria senha. O token sai
 * só da query do endereço e não é guardado no navegador.
 */
export default function InvitationAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  return (
    <AuthLayout title={content.title} subtitle={content.subtitle}>
      <Stack spacing={2.5}>
        {token === '' ? (
          <InvalidInvitation message={content.missingToken} />
        ) : (
          <Invitation token={token} />
        )}
      </Stack>
    </AuthLayout>
  );
}

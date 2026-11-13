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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useId, useMemo, useState } from 'react';
import { TENANT_PROFILES } from '../../constants/users.js';
import { profileLabels } from '../../data/profiles.js';
import {
  userFormContent as content,
  userFieldErrors,
} from '../../data/userPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { createUser, updateUser } from '../../services/userService.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import { digitsOnly, maskCpf, maskPhone } from '../../utils/masks.js';
import { userErrors } from '../../utils/userFields.js';

function messageFor(field, code) {
  const messages = userFieldErrors[field];
  return messages[code] ?? messages.default;
}

function initialValues(user) {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    cpf: user ? maskCpf(user.cpf) : '',
    phone: user?.phone ? maskPhone(user.phone) : '',
    profileCode: '',
  };
}

/** Corpo do cadastro, ou só os campos alterados na edição. */
function bodyFor(user, values) {
  const phone = values.phone.trim();
  if (!user) {
    return {
      name: values.name,
      email: values.email,
      cpf: values.cpf,
      ...(phone ? { phone } : {}),
      profileCode: values.profileCode,
    };
  }
  const body = {};
  if (values.name.trim() !== user.name) {
    body.name = values.name;
  }
  if (values.email.trim().toLowerCase() !== user.email) {
    body.email = values.email;
  }
  if (digitsOnly(values.cpf) !== user.cpf) {
    body.cpf = values.cpf;
  }
  // Telefone apagado vai como nulo, que a API grava como "sem telefone".
  if (phone !== (user.phone ?? '')) {
    body.phone = phone || null;
  }
  return body;
}

/**
 * Cadastro e edição de usuário (UC03), num diálogo; no celular, em tela
 * cheia. O perfil só se escolhe no cadastro: depois, muda pela ação própria,
 * que revoga vínculos. As regras da API apontam o campo antes do envio, e o
 * 409 de limite ou de vigência mostra a mensagem que a API manda.
 */
export default function UserFormDialog({ user = null, onClose, onSaved }) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const editing = user !== null;
  const [values, setValues] = useState(() => initialValues(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const body = useMemo(() => bodyFor(user, values), [user, values]);
  const unchanged = editing && Object.keys(body).length === 0;
  const action = useCallback(
    (payload) => (editing ? updateUser(user.id, payload) : createUser(payload)),
    [editing, user],
  );
  const { status, submit } = useSubmit(action);
  const pending = status === 'submitting';

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError(null);
  }

  async function save(event) {
    event.preventDefault();
    const found = fieldErrorsFrom(userErrors(body, { partial: editing }));
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(content.invalidFields);
      return;
    }
    const outcome = await submit(body);
    if (outcome.data) {
      onSaved(outcome);
      return;
    }
    const { error } = outcome;
    if (error.fields) {
      setErrors(fieldErrorsFrom(error.fields));
      setFormError(content.invalidFields);
      return;
    }
    setFormError(error.status === 409 ? error.message : content.unexpected);
  }

  const fieldProps = (name) => ({
    value: values[name],
    error: Boolean(errors[name]),
    helperText: errors[name] ? messageFor(name, errors[name]) : undefined,
    fullWidth: true,
  });

  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
    >
      <Box
        component="form"
        noValidate
        onSubmit={save}
        sx={{ display: 'contents' }}
      >
        <DialogTitle id={titleId}>
          {editing ? content.editTitle : content.newTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editing ? null : (
              <Typography variant="body2" color="text.secondary">
                {content.newIntro}
              </Typography>
            )}
            <TextField
              label={content.name}
              required
              onChange={(event) => change('name', event.target.value)}
              {...fieldProps('name')}
            />
            <TextField
              label={content.email}
              type="email"
              required
              onChange={(event) => change('email', event.target.value)}
              {...fieldProps('email')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={content.cpf}
                required
                inputMode="numeric"
                onChange={(event) => change('cpf', maskCpf(event.target.value))}
                {...fieldProps('cpf')}
              />
              <TextField
                label={content.phone}
                inputMode="tel"
                onChange={(event) =>
                  change('phone', maskPhone(event.target.value))
                }
                {...fieldProps('phone')}
              />
            </Stack>
            {editing ? null : (
              <TextField
                select
                label={content.profile}
                required
                onChange={(event) => change('profileCode', event.target.value)}
                {...fieldProps('profileCode')}
              >
                {TENANT_PROFILES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {profileLabels[code]}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {formError ? <Alert severity="error">{formError}</Alert> : null}
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
            disabled={unchanged}
          >
            {content.save}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

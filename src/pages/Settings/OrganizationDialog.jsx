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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId, useMemo, useState } from 'react';
import {
  organizationFieldErrors,
  organizationFormContent as content,
  organizationSectionContent,
} from '../../data/settingsPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { updateOwnOrganization } from '../../services/organizationService.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import { organizationErrors } from '../../utils/organizationFields.js';

const FIELDS = ['tradeName', 'legalName', 'document', 'phone', 'email'];
const labels = organizationSectionContent.fields;

function messageFor(field, code) {
  const messages = organizationFieldErrors[field];
  return messages[code] ?? messages.default;
}

/**
 * Só os campos alterados, como o PATCH da API. Opcional apagado vai como
 * nulo, que a API grava como "sem valor"; o nome fantasia é obrigatório.
 */
function bodyFor(organization, values) {
  const body = {};
  for (const field of FIELDS) {
    const value = values[field].trim();
    if (value === (organization[field] ?? '')) {
      continue;
    }
    body[field] = value === '' && field !== 'tradeName' ? null : value;
  }
  return body;
}

/**
 * Edição dos dados da organização da sessão (UC04), num diálogo; no
 * celular, em tela cheia. As regras da API apontam o campo antes do envio,
 * e o documento repetido em outra organização volta no próprio campo.
 */
export default function OrganizationDialog({ organization, onClose, onSaved }) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      FIELDS.map((field) => [field, organization[field] ?? '']),
    ),
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const body = useMemo(
    () => bodyFor(organization, values),
    [organization, values],
  );
  const unchanged = Object.keys(body).length === 0;
  const { status, submit } = useSubmit(updateOwnOrganization);
  const pending = status === 'submitting';

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function save(event) {
    event.preventDefault();
    const found = fieldErrorsFrom(organizationErrors(body));
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(content.invalidFields);
      return;
    }
    const outcome = await submit(body);
    if (outcome.data) {
      onSaved();
      return;
    }
    if (outcome.error.fields) {
      setErrors(fieldErrorsFrom(outcome.error.fields));
      setFormError(content.invalidFields);
      return;
    }
    setFormError(content.unexpected);
  }

  const fieldProps = (field) => ({
    label: labels[field],
    value: values[field],
    onChange: (event) => change(field, event.target.value),
    error: Boolean(errors[field]),
    helperText: errors[field] ? messageFor(field, errors[field]) : undefined,
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
        <DialogTitle id={titleId}>{content.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {content.intro}
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField required {...fieldProps('tradeName')} />
            <TextField {...fieldProps('legalName')} />
            <TextField
              {...fieldProps('document')}
              helperText={
                errors.document
                  ? messageFor('document', errors.document)
                  : content.documentHelper
              }
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField inputMode="tel" {...fieldProps('phone')} />
              <TextField type="email" {...fieldProps('email')} />
            </Stack>
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

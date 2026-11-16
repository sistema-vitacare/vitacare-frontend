import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useId, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import TemporaryPasswordField from '../../components/TemporaryPasswordField.jsx';
import { PATHS, organizationPath } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import {
  organizationFieldErrors,
  organizationFieldLabels as labels,
  organizationFormContent,
} from '../../data/organizationFields.js';
import {
  newOrganizationFieldErrors,
  organizationCreatedContent as created,
  organizationNewContent as content,
} from '../../data/organizationPages.js';
import { userFieldErrors } from '../../data/userPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { listPlans } from '../../services/organizationService.js';
import { createOrganization } from '../../services/platformOrganizationService.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import { formatNumber } from '../../utils/format.js';
import { maskCpf, maskPhone } from '../../utils/masks.js';
import { newOrganizationErrors } from '../../utils/organizationFields.js';

// Ordem dos campos na tela, que decide qual recebe o foco quando há erro. Os
// do administrador usam o caminho que a API aponta (`administrator.cpf`).
const ORGANIZATION_FIELDS = [
  'code',
  'tradeName',
  'legalName',
  'document',
  'phone',
  'email',
];
const ADMINISTRATOR_FIELDS = ['name', 'email', 'cpf', 'phone'];
const FIELD_ORDER = [
  ...ORGANIZATION_FIELDS,
  'usagePlanId',
  ...ADMINISTRATOR_FIELDS.map((field) => `administrator.${field}`),
];
const MASKS = {
  'administrator.cpf': maskCpf,
  'administrator.phone': maskPhone,
};

const emptyValues = () =>
  Object.fromEntries(FIELD_ORDER.map((field) => [field, '']));

function messageFor(field, code) {
  const [group, name] = field.split('.');
  const messages =
    group === 'administrator'
      ? userFieldErrors[name]
      : (newOrganizationFieldErrors[field] ?? organizationFieldErrors[field]);
  return messages?.[code] ?? messages?.default ?? content.invalidFields;
}

// Opcional em branco fica fora do corpo, como campo não informado na API.
const filled = (entries) =>
  Object.fromEntries(entries.filter(([, value]) => value.trim() !== ''));

function bodyFor(values) {
  return {
    code: values.code,
    tradeName: values.tradeName,
    ...filled(
      ['legalName', 'document', 'phone', 'email'].map((field) => [
        field,
        values[field],
      ]),
    ),
    usagePlanId: values.usagePlanId,
    administrator: {
      name: values['administrator.name'],
      email: values['administrator.email'],
      cpf: values['administrator.cpf'],
      ...filled([['phone', values['administrator.phone']]]),
    },
  };
}

function Section({ title, intro, children }) {
  return (
    <Card component="section" aria-label={title} sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h2" sx={{ mb: intro ? 1 : 2.5 }}>
        {title}
      </Typography>
      {intro ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {intro}
        </Typography>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
        }}
      >
        {children}
      </Box>
    </Card>
  );
}

/**
 * Senha provisória do primeiro administrador, que a API devolve uma única
 * vez: ao fechar, a tela abre a organização, e a senha não fica em lugar
 * nenhum.
 */
function CreatedDialog({ outcome, onClose }) {
  const titleId = useId();
  const { organization, administrator, temporaryPassword } = outcome;
  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id={titleId}>{created.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2">
            {created.intro(administrator.name, organization.tradeName)}
          </Typography>
          <TemporaryPasswordField password={temporaryPassword} />
          <Typography variant="body2">
            {created.loginCode(organization.code)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {created.validUntil}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {created.onlyOnce}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {created.open}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Cadastro de organização cliente (UC03), numa página: dados da
 * organização, plano do catálogo e primeiro administrador, que a API grava
 * juntos. As regras da API apontam o campo antes do envio, e o código e o
 * documento já usados voltam no próprio campo.
 */
export default function OrganizationNewPage() {
  const navigate = useNavigate();
  const plans = useResource(listPlans);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const { status, submit } = useSubmit(createOrganization);
  const pending = status === 'submitting';

  function change(field, value) {
    const mask = MASKS[field];
    setValues((current) => ({
      ...current,
      [field]: mask ? mask(value) : value,
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function showErrors(form, found) {
    setErrors(found);
    setFormError(content.invalidFields);
    const first = FIELD_ORDER.find((field) => found[field]);
    form.elements.namedItem(first)?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = bodyFor(values);
    const found = fieldErrorsFrom(newOrganizationErrors(body));
    if (Object.keys(found).length > 0) {
      showErrors(form, found);
      return;
    }
    const { data, error } = await submit(body);
    if (data) {
      setOutcome(data);
      return;
    }
    if (error.fields) {
      showErrors(form, fieldErrorsFrom(error.fields));
      return;
    }
    setFormError(content.unexpected);
  }

  function fieldProps(field, label) {
    const code = errors[field];
    return {
      name: field,
      id: `organization-${field.replace('.', '-')}`,
      label,
      value: values[field],
      onChange: (event) => change(field, event.target.value),
      error: Boolean(code),
      helperText: code ? messageFor(field, code) : undefined,
      fullWidth: true,
    };
  }

  const administrator = (field) =>
    fieldProps(`administrator.${field}`, content.administrator[field]);

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={content.subtitle}
        breadcrumbs={[
          { label: navLabels.organizations, to: PATHS.ORGANIZATIONS },
        ]}
      />
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <Section title={content.sections.organization}>
            <TextField
              {...fieldProps('code', labels.code)}
              required
              autoComplete="off"
              helperText={
                errors.code
                  ? messageFor('code', errors.code)
                  : content.codeHelper
              }
            />
            <TextField
              {...fieldProps('tradeName', labels.tradeName)}
              required
              autoComplete="off"
            />
            <TextField
              {...fieldProps('legalName', labels.legalName)}
              autoComplete="off"
            />
            <TextField
              {...fieldProps('document', labels.document)}
              helperText={
                errors.document
                  ? messageFor('document', errors.document)
                  : organizationFormContent.documentHelper
              }
            />
            <TextField
              {...fieldProps('phone', labels.phone)}
              type="tel"
              slotProps={{ htmlInput: { inputMode: 'tel' } }}
            />
            <TextField {...fieldProps('email', labels.email)} type="email" />
          </Section>

          <Section title={content.sections.plan}>
            <TextField
              {...fieldProps('usagePlanId', content.plan)}
              select
              required
              disabled={!plans.data}
              slotProps={{
                // Escolhido, o plano aparece só pelo nome; os limites ficam
                // na lista de opções.
                select: {
                  renderValue: (planId) =>
                    plans.data?.find((plan) => plan.id === planId)?.name ?? '',
                },
              }}
            >
              {(plans.data ?? []).map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {content.planOption(
                        formatNumber(plan.userLimit),
                        formatNumber(plan.patientLimit),
                      )}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Section>

          <Section
            title={content.sections.administrator}
            intro={content.administratorIntro}
          >
            <TextField {...administrator('name')} required autoComplete="off" />
            <TextField
              {...administrator('email')}
              required
              type="email"
              autoComplete="off"
            />
            <TextField
              {...administrator('cpf')}
              required
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              {...administrator('phone')}
              type="tel"
              slotProps={{ htmlInput: { inputMode: 'tel' } }}
            />
          </Section>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button
              component={RouterLink}
              to={PATHS.ORGANIZATIONS}
              disabled={pending}
            >
              {content.cancel}
            </Button>
            <Button type="submit" variant="contained" loading={pending}>
              {content.save}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {outcome ? (
        <CreatedDialog
          outcome={outcome}
          onClose={() =>
            navigate(organizationPath(outcome.organization.id), {
              replace: true,
            })
          }
        />
      ) : null}
    </>
  );
}

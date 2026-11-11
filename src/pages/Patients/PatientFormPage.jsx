import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { BRAZILIAN_STATES } from '../../constants/brazil.js';
import { PATHS, patientPath } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import {
  patientFieldLabels as labels,
  sexLabels,
} from '../../data/patientFields.js';
import {
  patientFormContent as content,
  patientFieldErrors,
} from '../../data/patientForm.js';
import { profileLabels } from '../../data/profiles.js';
import { useResource } from '../../hooks/useResource.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { listEligibleUsers } from '../../services/patientLinkService.js';
import {
  PATIENT_ERROR_CODES as CODES,
  createPatient,
  getPatient,
  updatePatient,
} from '../../services/patientService.js';
import { todayInSaoPaulo } from '../../utils/format.js';
import {
  digitsOnly,
  maskCpf,
  maskPhone,
  maskZipCode,
} from '../../utils/masks.js';
import {
  emptyPatientValues,
  patientToValues,
  toPatientPayload,
  validatePatient,
} from '../../utils/patientValidation.js';

const MASKS = { cpf: maskCpf, phone: maskPhone, zipCode: maskZipCode };

// Ordem dos campos na tela, para levar o foco ao primeiro com erro.
const FIELD_ORDER = [
  'name',
  'birthDate',
  'sex',
  'cpf',
  'phone',
  'email',
  'zipCode',
  'street',
  'number',
  'complement',
  'district',
  'city',
  'state',
  'mainCondition',
  'secondaryConditions',
  'responsibleUserId',
  'healthPlan',
  'notes',
];

// Mensagem de topo para cada erro da API que não é de um campo só.
const FORM_ERRORS = {
  [CODES.PLAN_LIMIT_REACHED]: content.planLimitReached,
  [CODES.PLAN_EXPIRED]: content.planExpired,
  [CODES.INACTIVE]: content.inactive,
};

const loadResponsibles = () =>
  listEligibleUsers({ role: 'responsible_professional', limit: 100 });

// O 422 da API aponta o campo do endereço como `address.state`.
function apiFieldErrors(error) {
  return Object.fromEntries(
    (error.fields ?? []).map(({ field }) => [
      field.replace(/^address\./, ''),
      'invalid',
    ]),
  );
}

function Section({ title, children }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h2" sx={{ mb: 2.5 }}>
        {title}
      </Typography>
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

function PatientForm({ patient }) {
  const navigate = useNavigate();
  const editing = Boolean(patient);
  const [values, setValues] = useState(() =>
    editing ? patientToValues(patient) : emptyPatientValues(),
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [duplicateCpf, setDuplicateCpf] = useState(null);
  const responsibles = useResource(loadResponsibles);
  const action = useCallback(
    (payload) =>
      editing ? updatePatient(patient.id, payload) : createPatient(payload),
    [editing, patient],
  );
  const { status, submit } = useSubmit(action);

  function change(name, value) {
    const mask = MASKS[name];
    setValues((current) => ({
      ...current,
      [name]: mask ? mask(value) : value,
    }));
    setErrors((current) => ({ ...current, [name]: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);
    setDuplicateCpf(null);
    const found = validatePatient(values, todayInSaoPaulo());
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((name) => found[name]);
    if (firstInvalid) {
      setFormError(content.invalidFields);
      form.elements[firstInvalid]?.focus();
      return;
    }

    const { data, error } = await submit(toPatientPayload(values));
    if (!error) {
      navigate(patientPath(data.id), { replace: true });
      return;
    }
    if (error.code === CODES.DUPLICATE_CPF) {
      setErrors({ cpf: 'duplicate' });
      setDuplicateCpf(digitsOnly(values.cpf));
    } else if (error.code === CODES.INVALID_RESPONSIBLE) {
      setErrors({ responsibleUserId: 'invalid' });
    } else if (error.status === 422) {
      setErrors(apiFieldErrors(error));
      setFormError(content.invalidFields);
    } else {
      setFormError(FORM_ERRORS[error.code] ?? content.unexpected);
    }
  }

  function fieldProps(name) {
    const error = errors[name];
    return {
      name,
      id: `patient-${name}`,
      label: labels[name],
      value: values[name],
      onChange: (event) => change(name, event.target.value),
      error: Boolean(error),
      helperText: error ? patientFieldErrors[name][error] : undefined,
      fullWidth: true,
    };
  }

  const cancelTo = editing ? patientPath(patient.id) : PATHS.PATIENTS;
  const responsibleOptions = responsibles.data ?? [];
  // Na edição o paciente chega antes da lista de responsáveis. Até a lista
  // chegar, o campo fica vazio e desabilitado: um valor fora das opções
  // deixaria o campo em branco sem explicação e faz o MUI avisar no console.
  const responsibleKnown = responsibleOptions.some(
    (user) => user.id === values.responsibleUserId,
  );

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        {duplicateCpf ? (
          <Alert severity="warning">
            {content.duplicateCpf}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Link
                component={RouterLink}
                to={`${PATHS.PATIENTS}?${new URLSearchParams({ busca: duplicateCpf })}`}
              >
                {content.searchActive}
              </Link>
              <Link
                component={RouterLink}
                to={`${PATHS.PATIENTS}?${new URLSearchParams({ busca: duplicateCpf, situacao: 'inactive' })}`}
              >
                {content.searchInactive}
              </Link>
            </Stack>
          </Alert>
        ) : null}

        <Section title={content.sections.personal}>
          <Box sx={{ gridColumn: { sm: 'span 2', lg: 'span 2' } }}>
            <TextField {...fieldProps('name')} required autoComplete="off" />
          </Box>
          <TextField
            {...fieldProps('birthDate')}
            required
            type="date"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: todayInSaoPaulo(), min: '1900-01-01' },
            }}
          />
          <TextField {...fieldProps('sex')} select>
            <MenuItem value="">{content.sexNotInformed}</MenuItem>
            {Object.entries(sexLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps('cpf')}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <TextField
            {...fieldProps('phone')}
            type="tel"
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
          />
          <TextField {...fieldProps('email')} type="email" />
        </Section>

        <Section title={content.sections.address}>
          <TextField
            {...fieldProps('zipCode')}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <Box sx={{ gridColumn: { sm: 'span 2', lg: 'span 2' } }}>
            <TextField {...fieldProps('street')} />
          </Box>
          <TextField {...fieldProps('number')} />
          <TextField {...fieldProps('complement')} />
          <TextField {...fieldProps('district')} />
          <TextField {...fieldProps('city')} />
          <TextField {...fieldProps('state')} select>
            <MenuItem value="">{content.stateNotInformed}</MenuItem>
            {BRAZILIAN_STATES.map((state) => (
              <MenuItem key={state} value={state}>
                {state}
              </MenuItem>
            ))}
          </TextField>
        </Section>

        <Section title={content.sections.clinical}>
          <TextField {...fieldProps('mainCondition')} />
          <Box sx={{ gridColumn: { sm: 'span 1', lg: 'span 2' } }}>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.secondaryConditions}
              onChange={(_, next) =>
                change(
                  'secondaryConditions',
                  next.map((item) => item.trim()).filter(Boolean),
                )
              }
              renderInput={(params) => {
                const props = fieldProps('secondaryConditions');
                return (
                  <TextField
                    {...params}
                    name={props.name}
                    label={props.label}
                    error={props.error}
                    helperText={props.helperText ?? content.secondaryHelper}
                  />
                );
              }}
            />
          </Box>
          <TextField
            {...fieldProps('responsibleUserId')}
            value={responsibleKnown ? values.responsibleUserId : ''}
            disabled={responsibles.status === 'loading'}
            select
            required
            helperText={
              errors.responsibleUserId
                ? patientFieldErrors.responsibleUserId[errors.responsibleUserId]
                : content.responsibleHelper
            }
          >
            {responsibleOptions.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} · {profileLabels[user.profile]}
                {user.status === 'pending'
                  ? ` (${content.pendingInvitation})`
                  : ''}
              </MenuItem>
            ))}
          </TextField>
          <TextField {...fieldProps('healthPlan')} />
          <Box sx={{ gridColumn: { sm: 'span 2', lg: 'span 3' } }}>
            <TextField {...fieldProps('notes')} multiline minRows={3} />
          </Box>
        </Section>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ justifyContent: 'flex-end' }}
        >
          <Button
            component={RouterLink}
            to={cancelTo}
            disabled={status === 'submitting'}
          >
            {content.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={status === 'submitting'}
          >
            {content.save}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function EditPatient({ patientId }) {
  const load = useCallback(() => getPatient(patientId), [patientId]);
  const resource = useResource(load);
  if (resource.status === 'error' && resource.error.status === 404) {
    return <Alert severity="warning">{content.notFound}</Alert>;
  }
  return (
    <ResourceState resource={resource}>
      {(patient) =>
        patient.status === 'inactive' ? (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                component={RouterLink}
                to={patientPath(patientId)}
              >
                {content.backToDetail}
              </Button>
            }
          >
            {content.inactive}
          </Alert>
        ) : (
          <PatientForm patient={patient} />
        )
      }
    </ResourceState>
  );
}

/** Cadastro e edição de paciente (UC07, Figura 35). */
export default function PatientFormPage() {
  const { patientId } = useParams();
  const editing = Boolean(patientId);
  return (
    <>
      <PageHeader
        title={editing ? content.editTitle : content.newTitle}
        subtitle={editing ? content.editSubtitle : content.newSubtitle}
        breadcrumbs={[{ label: navLabels.patients, to: PATHS.PATIENTS }]}
      />
      {editing ? <EditPatient patientId={patientId} /> : <PatientForm />}
    </>
  );
}

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useId, useMemo, useState } from 'react';
import {
  ALERT_RULE_OPERATORS,
  ALERT_SEVERITIES,
} from '../../constants/alerts.js';
import { alertOperatorLabels } from '../../data/alertPages.js';
import {
  alertRuleDialogContent as content,
  alertRuleFieldErrors,
} from '../../data/alertRuleSection.js';
import { severityLabels } from '../../data/patientFields.js';
import {
  usePatientNames,
  usePatientSearch,
} from '../../hooks/usePatientSearch.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  createAlertRule,
  updateAlertRule,
} from '../../services/alertRuleService.js';
import {
  createRuleBody,
  emptyRuleValues,
  monitorableFields,
  ruleValues,
  updateRuleBody,
} from '../../utils/alertRuleForm.js';
import { alertRuleErrors } from '../../utils/alertRules.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

// A regra geral, como opção da escolha. Fica fora do componente porque o
// Autocomplete apaga o texto digitado quando o valor muda de identidade.
const EVERYONE = { id: '', name: content.everyone };

function messageFor(field, code) {
  const messages = alertRuleFieldErrors[field];
  return messages[code] ?? messages.default;
}

function fieldLabel(field) {
  if (field.fieldType === 'scale') {
    return `${field.name} (${content.scaleRange(field.scaleMin, field.scaleMax)})`;
  }
  return field.unit ? `${field.name} (${field.unit})` : field.name;
}

/**
 * Nova regra de alerta e edição (UC09, passo 5). O campo é um número ou uma
 * escala da versão vigente; o paciente, um do público do formulário. Na
 * edição, campo e paciente ficam fixos, como na API.
 */
export default function AlertRuleDialog({
  form,
  rule = null,
  onClose,
  onSaved,
}) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const editing = rule !== null;
  const fields = monitorableFields(form.currentVersion);
  const [values, setValues] = useState(() =>
    editing ? ruleValues(rule) : emptyRuleValues(),
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const searchable = form.audience === 'organization';
  const { patients, known } = usePatientNames(
    searchable ? [] : form.patientIds,
  );
  const { found, setInput, loading } = usePatientSearch(patients);
  // Quem foi escolhido pela busca guarda o nome mesmo depois que ela muda.
  const [picked, setPicked] = useState(null);

  // Só os pacientes ativos a que o formulário se aplica podem ter regra
  // própria; a API recusa os outros. No público da organização, a escolha
  // busca na API quem não coube na primeira página.
  const candidates = (
    searchable
      ? found
      : known.filter((patient) => form.patientIds.includes(patient.id))
  ).filter((patient) => patient.status === 'active');
  const chosen = editing
    ? (rule.patient ?? EVERYONE)
    : ([...candidates, picked].find(
        (patient) => patient?.id === values.patientId,
      ) ?? EVERYONE);
  const patientOptions = [EVERYONE, ...candidates];
  if (!patientOptions.some((patient) => patient.id === chosen.id)) {
    patientOptions.push(chosen);
  }

  const body = useMemo(
    () =>
      editing ? updateRuleBody(rule, values) : createRuleBody(form.id, values),
    [editing, rule, form.id, values],
  );
  const unchanged = editing && Object.keys(body).length === 0;
  const selectedField = fields.find(
    (field) => field.fieldKey === values.fieldKey,
  );
  const unit = editing ? rule.field.unit : (selectedField?.unit ?? null);

  const action = useCallback(
    (payload) =>
      editing ? updateAlertRule(rule.id, payload) : createAlertRule(payload),
    [editing, rule],
  );
  const { status, submit } = useSubmit(action);
  const pending = status === 'submitting';

  const errorKey = (name) => (name === 'reference' ? 'referenceValue' : name);

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [errorKey(name)]: undefined }));
    setFormError(null);
  }

  async function save(event) {
    event.preventDefault();
    const found = fieldErrorsFrom(alertRuleErrors(body, { partial: editing }));
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(content.invalidFields);
      return;
    }
    const { data, error } = await submit(body);
    if (data) {
      onSaved(data);
      return;
    }
    if (error.fields) {
      setErrors(fieldErrorsFrom(error.fields));
      setFormError(content.invalidFields);
      return;
    }
    setFormError(content.errors[error.code] ?? content.unexpected);
  }

  const props = (name) => {
    const key = errorKey(name);
    return {
      value: values[name],
      onChange: (event) => change(name, event.target.value),
      error: Boolean(errors[key]),
      fullWidth: true,
      ...(errors[key] ? { helperText: messageFor(key, errors[key]) } : {}),
    };
  };

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
            <TextField
              select
              label={content.field}
              required
              disabled={editing}
              helperText={editing ? content.lockedHelper : content.fieldHelper}
              {...props('fieldKey')}
            >
              {editing ? (
                <MenuItem value={rule.field.key}>
                  {rule.field.unit
                    ? `${rule.field.name} (${rule.field.unit})`
                    : rule.field.name}
                </MenuItem>
              ) : (
                fields.map((field) => (
                  <MenuItem key={field.fieldKey} value={field.fieldKey}>
                    {fieldLabel(field)}
                  </MenuItem>
                ))
              )}
            </TextField>
            <Autocomplete
              options={patientOptions}
              value={chosen}
              disabled={editing}
              disableClearable
              onChange={(_, patient) => {
                setPicked(patient);
                change('patientId', patient.id);
              }}
              // Só a digitação busca; a escolha e a saída do campo limpam a
              // busca, para o nome escolhido não virar outra consulta.
              onInputChange={(_, text, reason) => {
                if (searchable) {
                  setInput(reason === 'input' ? text : '');
                }
              }}
              loading={loading}
              getOptionLabel={(patient) => patient.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={content.noPatients}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={content.patient}
                  error={Boolean(errors.patientId)}
                  helperText={
                    errors.patientId
                      ? messageFor('patientId', errors.patientId)
                      : content.patientHelper
                  }
                />
              )}
            />
            <TextField
              label={content.name}
              required
              helperText={content.nameHelper}
              {...props('name')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label={content.operator}
                required
                {...props('operator')}
              >
                {ALERT_RULE_OPERATORS.map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {alertOperatorLabels[operator]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={content.reference}
                required
                helperText={content.referenceHelper}
                slotProps={{
                  htmlInput: { inputMode: 'decimal' },
                  input: unit
                    ? {
                        endAdornment: (
                          <InputAdornment position="end">{unit}</InputAdornment>
                        ),
                      }
                    : undefined,
                }}
                {...props('reference')}
              />
            </Stack>
            <TextField
              select
              label={content.severity}
              required
              {...props('severity')}
            >
              {ALERT_SEVERITIES.map((severity) => (
                <MenuItem key={severity} value={severity}>
                  {severityLabels[severity]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={content.description}
              multiline
              minRows={2}
              {...props('description')}
            />
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

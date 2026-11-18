import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Plus, X } from '@phosphor-icons/react';
import { useCallback, useId, useMemo, useState } from 'react';
import { DOSE_UNITS, MEDICATION_ROUTES } from '../../constants/medications.js';
import {
  medicationDialogContent as content,
  doseUnitNames,
  medicationFieldErrors,
  routeLabels,
} from '../../data/medicationPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  createMedication,
  updateMedication,
} from '../../services/medicationService.js';
import { todayInSaoPaulo } from '../../utils/format.js';
import { medicationErrors } from '../../utils/medicationFields.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import {
  createBody,
  emptyMedicationValues,
  medicationValues,
  updateBody,
} from '../../utils/medicationForm.js';

function messageFor(field, code) {
  const messages = medicationFieldErrors[field];
  return messages[code] ?? messages.default;
}

/**
 * Cadastro e edição de um medicamento (UC08), num diálogo sobre a lista; no
 * celular, em tela cheia. As regras da API apontam o campo antes do envio;
 * na edição, só vão os campos alterados, e o Salvar espera uma mudança.
 */
export default function MedicationDialog({
  patient,
  medication = null,
  onClose,
  onSaved,
}) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const editing = medication !== null;
  const today = todayInSaoPaulo();
  const [values, setValues] = useState(() =>
    editing ? medicationValues(medication) : emptyMedicationValues(today),
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const body = useMemo(
    () =>
      editing ? updateBody(medication, values) : createBody(patient.id, values),
    [editing, medication, patient.id, values],
  );
  const unchanged = editing && Object.keys(body).length === 0;

  const action = useCallback(
    (payload) =>
      editing
        ? updateMedication(medication.id, payload)
        : createMedication(payload),
    [editing, medication],
  );
  const { status, submit } = useSubmit(action);
  const pending = status === 'submitting';

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name === 'dose' ? 'doseAmount' : name]: undefined,
    }));
    setFormError(null);
  }

  function changeTime(index, value) {
    change(
      'times',
      values.times.map((time, position) => (position === index ? value : time)),
    );
  }

  async function save(event) {
    event.preventDefault();
    const found = fieldErrorsFrom(
      medicationErrors(body, { today, partial: editing }),
    );
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
    if (error.status === 422 && error.fields) {
      setErrors(fieldErrorsFrom(error.fields));
      setFormError(content.invalidFields);
      return;
    }
    setFormError(content.errors[error.code] ?? content.unexpected);
  }

  const fieldProps = (name, errorKey = name) => ({
    value: values[name],
    onChange: (event) => change(name, event.target.value),
    error: Boolean(errors[errorKey]),
    helperText: errors[errorKey]
      ? messageFor(errorKey, errors[errorKey])
      : undefined,
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
          <Typography variant="body2" color="text.secondary">
            {content.patient(patient.name)}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label={content.name} required {...fieldProps('name')} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={content.dose}
                required
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                {...fieldProps('dose', 'doseAmount')}
                helperText={
                  errors.doseAmount
                    ? messageFor('doseAmount', errors.doseAmount)
                    : content.doseHelper
                }
              />
              <TextField
                select
                label={content.doseUnit}
                required
                {...fieldProps('doseUnit')}
              >
                {DOSE_UNITS.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {doseUnitNames[unit].one}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField select label={content.route} {...fieldProps('route')}>
              <MenuItem value="">{content.routeNotInformed}</MenuItem>
              {MEDICATION_ROUTES.map((route) => (
                <MenuItem key={route} value={route}>
                  {routeLabels[route]}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography variant="subtitle2" component="p">
                {content.times}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
              >
                {content.timesHelper}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {values.times.map((time, index) => (
                  // A posição identifica o campo: horários repetidos são
                  // justamente o erro que a tela precisa mostrar.
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <TextField
                      type="time"
                      label={content.time(index)}
                      value={time}
                      onChange={(event) =>
                        changeTime(index, event.target.value)
                      }
                      error={Boolean(errors.times)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ flex: 1 }}
                    />
                    {values.times.length > 1 ? (
                      <IconButton
                        aria-label={content.removeTime(index)}
                        onClick={() =>
                          change(
                            'times',
                            values.times.filter(
                              (_, position) => position !== index,
                            ),
                          )
                        }
                      >
                        <X size={18} />
                      </IconButton>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
              {errors.times ? (
                <Typography
                  variant="caption"
                  color="error.main"
                  component="p"
                  sx={{ mt: 0.5 }}
                >
                  {messageFor('times', errors.times)}
                </Typography>
              ) : null}
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => change('times', [...values.times, ''])}
                sx={{ mt: 1 }}
              >
                {content.addTime}
              </Button>
            </Box>
            <TextField
              label={content.intervalDays}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              {...fieldProps('intervalDays')}
              helperText={
                errors.intervalDays
                  ? messageFor('intervalDays', errors.intervalDays)
                  : content.intervalHelper
              }
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                label={content.startDate}
                slotProps={{ inputLabel: { shrink: true } }}
                {...fieldProps('startDate')}
              />
              <TextField
                type="date"
                label={content.endDate}
                slotProps={{ inputLabel: { shrink: true } }}
                {...fieldProps('endDate')}
                helperText={
                  errors.endDate
                    ? messageFor('endDate', errors.endDate)
                    : content.endDateHelper
                }
              />
            </Stack>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.remindersEnabled}
                    onChange={(event) =>
                      change('remindersEnabled', event.target.checked)
                    }
                  />
                }
                label={content.reminders}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
              >
                {content.remindersHelper}
              </Typography>
            </Box>
            <TextField
              label={content.notes}
              multiline
              minRows={2}
              {...fieldProps('notes')}
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

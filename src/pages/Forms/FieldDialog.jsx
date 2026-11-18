import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId, useState } from 'react';
import {
  CHOICE_TYPES,
  FIELD_TYPES,
  REQUIREMENTS,
} from '../../constants/formFields.js';
import { fieldTypeLabels, requirementLabels } from '../../data/formLabels.js';
import {
  formFieldErrors,
  formPageContent as content,
} from '../../data/formPage.js';
import {
  emptyFieldValues,
  fieldToValues,
  toFieldPayload,
  validateField,
} from '../../utils/formEditor.js';

const DECIMAL_OPTIONS = [0, 1, 2, 3];

function errorText(property, code) {
  if (!code) {
    return undefined;
  }
  return formFieldErrors[property]?.[code] ?? formFieldErrors.fallback;
}

/**
 * Diálogo de um campo: novo ou editado. Confere o campo com as regras da
 * API junto dos outros campos (`others`) e devolve o campo no formato da
 * API por `onApply`. O tipo de um campo que já tem chave não muda, como na
 * API: mudar o tipo é criar outro campo.
 */
export default function FieldDialog({
  open,
  field,
  others,
  sections,
  onApply,
  onClose,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const [values, setValues] = useState(() =>
    field ? fieldToValues(field) : emptyFieldValues(),
  );
  const [errors, setErrors] = useState({});
  const typeLocked = Boolean(field?.fieldKey);

  function change(property, value) {
    setValues((current) => ({ ...current, [property]: value }));
    setErrors((current) => ({ ...current, [property]: undefined }));
  }

  function apply(event) {
    event.preventDefault();
    const found = validateField(values, others);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onApply(toFieldPayload(values));
  }

  // O erro da regra vence a orientação do campo.
  const input = (property, { helperText, ...props } = {}) => ({
    label: content.dialog[property],
    value: values[property],
    onChange: (event) => change(property, event.target.value),
    error: Boolean(errors[property]),
    helperText: errorText(property, errors[property]) ?? helperText,
    fullWidth: true,
    ...props,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" noValidate onSubmit={apply}>
        <DialogTitle id={titleId}>
          {field ? content.dialog.editTitle : content.dialog.newTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              {...input('name', { required: true, autoFocus: true })}
            />
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <TextField
                {...input('fieldType', {
                  select: true,
                  disabled: typeLocked,
                  helperText: typeLocked
                    ? content.dialog.typeLocked
                    : undefined,
                })}
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {fieldTypeLabels[type]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField {...input('requirement', { select: true })}>
                {REQUIREMENTS.map((requirement) => (
                  <MenuItem key={requirement} value={requirement}>
                    {requirementLabels[requirement]}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Autocomplete
              freeSolo
              options={sections}
              inputValue={values.section}
              onInputChange={(_, value) => change('section', value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={content.dialog.section}
                  error={Boolean(errors.section)}
                  helperText={
                    errorText('section', errors.section) ??
                    content.dialog.sectionHelper
                  }
                />
              )}
            />
            {values.fieldType === 'number' ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <TextField
                  {...input('unit', { helperText: content.dialog.unitHelper })}
                />
                <TextField {...input('decimalPlaces', { select: true })}>
                  {DECIMAL_OPTIONS.map((option) => (
                    <MenuItem key={option} value={String(option)}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ) : null}
            {values.fieldType === 'scale' ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: '1fr 1fr',
                }}
              >
                <TextField
                  {...input('scaleMin', {
                    slotProps: { htmlInput: { inputMode: 'numeric' } },
                  })}
                />
                <TextField
                  {...input('scaleMax', {
                    slotProps: { htmlInput: { inputMode: 'numeric' } },
                  })}
                />
              </Box>
            ) : null}
            {CHOICE_TYPES.includes(values.fieldType) ? (
              <TextField
                {...input('options', {
                  multiline: true,
                  minRows: 3,
                  helperText: content.dialog.optionsHelper,
                })}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{content.dialog.cancel}</Button>
          <Button type="submit" variant="contained">
            {content.dialog.confirm}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

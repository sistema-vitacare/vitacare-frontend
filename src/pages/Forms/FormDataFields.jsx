import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useId, useState } from 'react';
import { AUDIENCES, FREQUENCY_UNITS } from '../../constants/formFields.js';
import {
  audienceLabels,
  frequencyText,
  frequencyUnitLabels,
} from '../../data/formLabels.js';
import {
  formFieldErrors,
  formPageContent as content,
} from '../../data/formPage.js';
import {
  usePatientNames,
  usePatientSearch,
} from '../../hooks/usePatientSearch.js';

function patientIn(pool, patientId) {
  return (
    pool.find((patient) => patient.id === patientId) ?? {
      id: patientId,
      name: patientId,
    }
  );
}

function errorText(property, code) {
  if (!code) {
    return undefined;
  }
  return formFieldErrors[property]?.[code] ?? formFieldErrors.fallback;
}

/** Dados do formulário em leitura: o cuidador e o formulário desativado. */
export function FormDataSummary({ form }) {
  const { known } = usePatientNames(form.patientIds);
  const rows = [
    [content.data.description, form.description || content.data.emptyValue],
    [content.data.trackingType, form.trackingType || content.data.emptyValue],
    [content.data.hasFrequency, frequencyText(form.frequency)],
    [
      content.data.audience,
      form.audience === 'patients'
        ? form.patientIds.map((id) => patientIn(known, id).name).join(', ')
        : audienceLabels.organization,
    ],
  ];
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.5 }}>
      {rows.map(([label, value]) => (
        <Box key={label}>
          <Typography component="dt" variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            sx={{ m: 0, overflowWrap: 'anywhere' }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Campos dos dados do formulário: nome, descrição, tipo de acompanhamento,
 * frequência esperada e público. Mudar estes dados não cria versão nova.
 */
export default function FormDataFields({ values, errors, onChange }) {
  const audienceId = useId();
  const { patients, known } = usePatientNames(values.patientIds);
  const { found, input, setInput, loading } = usePatientSearch(patients);
  // Quem foi escolhido pela busca guarda o nome mesmo depois que ela muda.
  const [picked, setPicked] = useState([]);
  const selected = values.patientIds.map((id) =>
    patientIn([...known, ...found, ...picked], id),
  );
  const options = [
    ...found,
    ...selected.filter(
      (patient) => !found.some((option) => option.id === patient.id),
    ),
  ];
  // O erro da regra vence a orientação do campo.
  const field = (property, { helperText, ...props } = {}) => ({
    label: content.data[property],
    value: values[property],
    onChange: (event) => onChange({ [property]: event.target.value }),
    error: Boolean(errors[property]),
    helperText: errorText(property, errors[property]) ?? helperText,
    fullWidth: true,
    ...props,
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <TextField {...field('name', { required: true })} />
      <TextField
        {...field('trackingType', {
          helperText: content.data.trackingTypeHelper,
        })}
      />
      <TextField
        {...field('description', { multiline: true, minRows: 2 })}
        sx={{ gridColumn: { md: '1 / -1' } }}
      />
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <FormControlLabel
          control={
            <Switch
              checked={values.hasFrequency}
              onChange={(event) =>
                onChange({ hasFrequency: event.target.checked })
              }
            />
          }
          label={content.data.hasFrequency}
        />
        <Typography variant="caption" color="text.secondary" component="p">
          {content.data.frequencyHelper}
        </Typography>
        {values.hasFrequency ? (
          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: '1fr 1fr',
              maxWidth: 420,
            }}
          >
            <TextField
              {...field('interval', {
                slotProps: { htmlInput: { inputMode: 'numeric' } },
              })}
            />
            <TextField {...field('unit', { select: true })}>
              {FREQUENCY_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {frequencyUnitLabels[unit]}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        ) : null}
      </Box>
      <FormControl sx={{ gridColumn: { md: '1 / -1' } }}>
        <FormLabel id={audienceId}>{content.data.audience}</FormLabel>
        <RadioGroup
          row
          aria-labelledby={audienceId}
          value={values.audience}
          onChange={(event) => onChange({ audience: event.target.value })}
        >
          {AUDIENCES.map((audience) => (
            <FormControlLabel
              key={audience}
              value={audience}
              control={<Radio />}
              label={audienceLabels[audience]}
            />
          ))}
        </RadioGroup>
      </FormControl>
      {values.audience === 'patients' ? (
        <Autocomplete
          multiple
          options={options}
          value={selected}
          onChange={(_, chosen) => {
            setPicked(chosen);
            onChange({ patientIds: chosen.map((patient) => patient.id) });
          }}
          // O valor é refeito a cada render, e o MUI apaga o texto por isso
          // (`reset`); o texto só muda pela digitação, pela escolha e ao sair.
          inputValue={input}
          onInputChange={(_, text, reason) => {
            if (reason !== 'reset') {
              setInput(text);
            }
          }}
          loading={loading}
          getOptionLabel={(patient) => patient.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={content.data.noPatients}
          sx={{ gridColumn: { md: '1 / -1' } }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={content.data.patients}
              placeholder={content.data.patientsPlaceholder}
              error={Boolean(errors.patientIds)}
              helperText={errorText('patientIds', errors.patientIds)}
            />
          )}
        />
      ) : null}
    </Box>
  );
}

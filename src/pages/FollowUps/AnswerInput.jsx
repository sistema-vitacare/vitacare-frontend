import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  InputAdornment,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useId, useState } from 'react';
import { visitRecordContent as content } from '../../data/visitRecord.js';

function Label({ id, field }) {
  return (
    <FormLabel id={id} sx={{ color: 'text.primary', fontWeight: 600 }}>
      {field.name}
      {field.requirement === 'required' ? (
        <Typography component="span" variant="caption" color="text.secondary">
          {' '}
          ({content.required})
        </Typography>
      ) : null}
    </FormLabel>
  );
}

// A escala começa vazia: o polegar fica invisível até a primeira escolha,
// para que o início da escala não pareça um valor informado. Limpar recria
// o controle, porque o MUI guarda o último valor escolhido e o devolveria
// no clique seguinte.
function ScaleInput({ field, value, onChange, labelId }) {
  const [generation, setGeneration] = useState(0);
  const empty = value === null || value === undefined;
  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Label id={labelId} field={field} />
        <Typography
          aria-hidden="true"
          variant="body2"
          sx={{ fontWeight: 700 }}
          color={empty ? 'text.secondary' : 'primary.main'}
        >
          {empty ? content.notInformed : value}
        </Typography>
      </Stack>
      <Box sx={{ px: 1 }}>
        <Slider
          key={generation}
          value={empty ? field.scaleMin : value}
          min={field.scaleMin}
          max={field.scaleMax}
          step={1}
          aria-labelledby={labelId}
          getAriaValueText={(current) =>
            empty ? content.notInformed : String(current)
          }
          onChange={(_, next) => onChange(next)}
          onChangeCommitted={(_, next) => onChange(next)}
          sx={
            empty
              ? {
                  '& .MuiSlider-thumb': { opacity: 0 },
                  '& .MuiSlider-track': { opacity: 0 },
                }
              : undefined
          }
        />
      </Box>
      {!empty ? (
        <Box>
          <Button
            size="small"
            aria-label={content.clear(field.name)}
            onClick={() => {
              onChange(null);
              setGeneration((count) => count + 1);
            }}
          >
            {content.clearLabel}
          </Button>
        </Box>
      ) : null}
    </>
  );
}

/**
 * Entrada de uma resposta, pelo tipo do campo. Todo tipo tem o estado "não
 * informado": número e texto vazios, sim/não e escolha única sem botão
 * marcado, múltipla escolha sem caixa marcada e escala sem polegar.
 */
export default function AnswerInput({ field, value, error, onChange }) {
  const labelId = useId();
  const helper = error ? <FormHelperText error>{error}</FormHelperText> : null;

  if (field.fieldType === 'number') {
    return (
      <TextField
        label={field.name}
        required={field.requirement === 'required'}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        error={Boolean(error)}
        helperText={error}
        fullWidth
        slotProps={{
          htmlInput: { inputMode: 'decimal' },
          input: field.unit
            ? {
                endAdornment: (
                  <InputAdornment position="end">{field.unit}</InputAdornment>
                ),
              }
            : undefined,
        }}
      />
    );
  }
  if (field.fieldType === 'text') {
    return (
      <TextField
        label={field.name}
        required={field.requirement === 'required'}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        error={Boolean(error)}
        helperText={error}
        multiline
        minRows={2}
        fullWidth
      />
    );
  }
  if (field.fieldType === 'scale') {
    return (
      <FormControl fullWidth error={Boolean(error)}>
        <ScaleInput
          field={field}
          value={value}
          onChange={onChange}
          labelId={labelId}
        />
        {helper}
      </FormControl>
    );
  }
  if (field.fieldType === 'multiple_choice') {
    const selected = value ?? [];
    return (
      <FormControl
        component="fieldset"
        error={Boolean(error)}
        sx={{ gap: 0.5 }}
      >
        <Label id={labelId} field={field} />
        <FormGroup>
          {field.options.map((option) => (
            <FormControlLabel
              key={option}
              label={option}
              control={
                <Checkbox
                  checked={selected.includes(option)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, option]
                        : selected.filter((item) => item !== option),
                    )
                  }
                />
              }
            />
          ))}
        </FormGroup>
        {helper}
      </FormControl>
    );
  }
  // Sim/não e escolha única: um botão por valor; tocar de novo no marcado
  // volta a "não informado".
  const choices =
    field.fieldType === 'boolean'
      ? [
          [true, content.yes],
          [false, content.no],
        ]
      : field.options.map((option) => [option, option]);
  return (
    <FormControl error={Boolean(error)} sx={{ gap: 0.75 }}>
      <Label id={labelId} field={field} />
      <ToggleButtonGroup
        exclusive
        value={value ?? null}
        onChange={(_, next) => onChange(next)}
        aria-labelledby={labelId}
        sx={{ flexWrap: 'wrap' }}
      >
        {choices.map(([choice, label]) => (
          <ToggleButton key={String(choice)} value={choice} sx={{ px: 2.5 }}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {helper}
    </FormControl>
  );
}

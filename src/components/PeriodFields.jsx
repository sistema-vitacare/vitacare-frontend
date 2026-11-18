import { TextField } from '@mui/material';
import { periodFieldsContent as content } from '../data/periodFields.js';

/**
 * Início e fim de um período em dias de Brasília. `onChange` recebe só o
 * campo alterado; `errors` traz o código da API por campo.
 */
export default function PeriodFields({ from, to, onChange, errors = {} }) {
  const field = (name, value) => (
    <TextField
      type="date"
      label={content[name]}
      value={value}
      onChange={(event) => onChange({ [name]: event.target.value })}
      error={Boolean(errors[name])}
      helperText={errors[name] ? content.errors[errors[name]] : undefined}
      size="small"
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
  return (
    <>
      {field('from', from)}
      {field('to', to)}
    </>
  );
}

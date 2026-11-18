import { Stack, TextField } from '@mui/material';
import PeriodFields from '../../components/PeriodFields.jsx';
import { managementFiltersContent as content } from '../../data/managementReports.js';

/** Período e condição dos relatórios gerenciais, guardados no endereço. */
export default function ManagementFilters({ filters }) {
  const { from, to, condition, errors, update } = filters;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <PeriodFields from={from} to={to} onChange={update} errors={errors} />
      <TextField
        label={content.condition}
        placeholder={content.conditionPlaceholder}
        helperText={content.conditionHelper}
        value={condition}
        onChange={(event) => update({ condition: event.target.value })}
        size="small"
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
    </Stack>
  );
}

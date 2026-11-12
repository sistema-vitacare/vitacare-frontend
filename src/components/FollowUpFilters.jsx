import { Box, Button, MenuItem, TextField } from '@mui/material';
import { followUpRecordsContent as content } from '../data/followUpRecords.js';

/**
 * Filtros da lista de registros: período (dias de Brasília), formulário e
 * responsável, com as opções dos registros do paciente.
 */
export default function FollowUpFilters({ filters, update, options }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr) auto' },
        alignItems: 'center',
      }}
    >
      <TextField
        type="date"
        label={content.filters.from}
        value={filters.from}
        onChange={(event) => update({ from: event.target.value })}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type="date"
        label={content.filters.to}
        value={filters.to}
        onChange={(event) => update({ to: event.target.value })}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        select
        label={content.filters.form}
        value={filters.formId}
        onChange={(event) => update({ formId: event.target.value })}
        size="small"
      >
        <MenuItem value="">{content.filters.all}</MenuItem>
        {options.forms.map((form) => (
          <MenuItem key={form.id} value={form.id}>
            {form.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={content.filters.author}
        value={filters.authorUserId}
        onChange={(event) => update({ authorUserId: event.target.value })}
        size="small"
      >
        <MenuItem value="">{content.filters.all}</MenuItem>
        {options.authors.map((author) => (
          <MenuItem key={author.id} value={author.id}>
            {author.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        onClick={() =>
          update({ from: '', to: '', formId: '', authorUserId: '' })
        }
      >
        {content.filters.clear}
      </Button>
    </Box>
  );
}

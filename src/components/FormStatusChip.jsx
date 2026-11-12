import { Chip } from '@mui/material';
import { formStatusLabels } from '../data/formLabels.js';

const COLORS = { active: 'success', draft: 'warning', inactive: 'default' };

/** Situação do formulário: rascunho (nunca publicado), ativo ou inativo. */
export default function FormStatusChip({ status }) {
  return (
    <Chip
      size="small"
      label={formStatusLabels[status]}
      color={COLORS[status]}
      variant={status === 'inactive' ? 'outlined' : 'filled'}
    />
  );
}

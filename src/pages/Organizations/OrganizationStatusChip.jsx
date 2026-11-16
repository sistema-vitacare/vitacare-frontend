import { Chip } from '@mui/material';
import { organizationStatusLabels } from '../../data/organizationPages.js';

const TONES = {
  active: { color: 'success', variant: 'filled' },
  inactive: { color: 'default', variant: 'outlined' },
};

/** Situação da organização cliente. */
export default function OrganizationStatusChip({ status }) {
  return (
    <Chip
      size="small"
      label={organizationStatusLabels[status]}
      {...TONES[status]}
    />
  );
}

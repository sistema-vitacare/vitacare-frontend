import { Chip } from '@mui/material';
import { patientStatusLabels } from '../data/patientFields.js';

// Situação cadastral, e não clínica: a API não classifica o paciente.
export default function PatientStatusChip({ status }) {
  return (
    <Chip
      size="small"
      label={patientStatusLabels[status]}
      color={status === 'active' ? 'success' : 'default'}
      variant={status === 'active' ? 'filled' : 'outlined'}
    />
  );
}

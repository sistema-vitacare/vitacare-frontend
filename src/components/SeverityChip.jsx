import { Chip } from '@mui/material';
import { SEVERITY_TONE } from '../constants/alerts.js';
import { severityLabels } from '../data/patientFields.js';

/**
 * Severidade do alerta ou da regra, na cor de estado dela sobre o fundo
 * claro da mesma cor. Na API, a severidade é só um rótulo.
 */
export default function SeverityChip({ severity }) {
  const tone = SEVERITY_TONE[severity];
  return (
    <Chip
      size="small"
      label={severityLabels[severity]}
      sx={{ bgcolor: `${tone}.light`, color: `${tone}.main` }}
    />
  );
}

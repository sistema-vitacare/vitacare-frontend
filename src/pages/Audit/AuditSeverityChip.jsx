import { Chip } from '@mui/material';
import { auditSeverityLabels } from '../../data/auditPages.js';

// Cor de estado de cada gravidade; `normal` fica neutra, porque a cor só
// indica situação que pede atenção.
const TONE = { critical: 'error', warning: 'warning', info: 'info' };

/** Gravidade do evento de auditoria (info, normal, atenção ou crítico). */
export default function AuditSeverityChip({ severity }) {
  const tone = TONE[severity];
  return (
    <Chip
      size="small"
      label={auditSeverityLabels[severity] ?? severity}
      variant={tone ? 'filled' : 'outlined'}
      sx={tone ? { bgcolor: `${tone}.light`, color: `${tone}.main` } : null}
    />
  );
}

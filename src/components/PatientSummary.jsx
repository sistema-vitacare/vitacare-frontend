import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material';
import { patientDetailContent as content } from '../data/patientDetail.js';
import {
  patientFieldLabels as labels,
  maskedFieldText,
  sexLabels,
} from '../data/patientFields.js';
import { ageFromBirthDate, isMasked } from '../utils/format.js';
import { initials } from '../utils/initials.js';
import { maskCpf } from '../utils/masks.js';
import PatientStatusChip from './PatientStatusChip.jsx';

function Info({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function cpfText(cpf) {
  if (isMasked(cpf)) {
    return maskedFieldText;
  }
  return cpf ? maskCpf(cpf) : content.registration.empty;
}

/**
 * Identificação do paciente no topo do detalhe e do histórico: idade, sexo,
 * CPF, condições, responsável e situação. Sem situação clínica, que a API
 * não calcula.
 */
export default function PatientSummary({ patient }) {
  const facts = [
    content.summary.years(ageFromBirthDate(patient.birthDate)),
    patient.sex ? sexLabels[patient.sex] : null,
  ].filter(Boolean);
  const conditions = [
    patient.mainCondition,
    ...patient.secondaryConditions,
  ].filter(Boolean);

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}
        >
          <Avatar
            aria-hidden="true"
            sx={{
              width: 56,
              height: 56,
              fontWeight: 700,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            {initials(patient.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {facts.join(' · ')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {labels.cpf}: {cpfText(patient.cpf)}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {conditions.length > 0 ? (
                conditions.map((condition) => (
                  <Chip key={condition} size="small" label={condition} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {content.summary.noConditions}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, auto)' },
            alignItems: 'start',
          }}
        >
          <Info label={labels.responsible}>{patient.responsible?.name}</Info>
          {patient.viewerLink?.linkType ? (
            <Info label={content.summary.yourLink}>
              {patient.viewerLink.linkType}
            </Info>
          ) : null}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              {labels.status}
            </Typography>
            <PatientStatusChip status={patient.status} />
          </Box>
        </Box>
      </Stack>
    </Card>
  );
}

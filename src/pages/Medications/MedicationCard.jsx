import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useId } from 'react';
import {
  medicationCardContent as content,
  doseUnitNames,
  routeLabels,
} from '../../data/medicationPages.js';
import {
  formatDate,
  formatDateTime,
  formatDose,
  todayInSaoPaulo,
} from '../../utils/format.js';
import { daysSinceStart } from '../../utils/medicationSchedule.js';

/** Período do tratamento: desde quando, a partir de quando ou até quando. */
function periodText(medication, now) {
  if (medication.status === 'inactive') {
    // O dia da inativação em Brasília, e não o dia UTC do instante.
    return content.inactiveSince(
      formatDate(todayInSaoPaulo(new Date(medication.deactivatedAt))),
    );
  }
  const { startDate, endDate } = medication.schedule;
  // Depois do último dia, o tratamento acabou, mesmo ainda ativo.
  if (endDate && daysSinceStart(endDate, now) > 0) {
    return content.ended(formatDate(endDate));
  }
  const days = daysSinceStart(startDate, now);
  const start =
    days < 0
      ? content.startsOn(formatDate(startDate))
      : content.since(formatDate(startDate), days);
  return endDate ? `${start}, ${content.until(formatDate(endDate))}` : start;
}

function frequencyText(schedule) {
  const times = content.timesPerDay(schedule.times);
  return schedule.intervalDays > 1
    ? `${times}, ${content.everyNDays(schedule.intervalDays)}`
    : times;
}

/**
 * Cartão de um medicamento (Figura 41), com as ações que a sessão e a
 * situação permitem: editar e reativar só com o paciente ativo, como a API.
 */
export default function MedicationCard({
  medication,
  canEdit,
  canDeactivate,
  patientActive,
  onEdit,
  onDeactivate,
  onReactivate,
  now = new Date(),
}) {
  const titleId = useId();
  const active = medication.status === 'active';
  const actions = [
    canEdit && active && patientActive ? (
      <Button key="edit" size="small" variant="outlined" onClick={onEdit}>
        {content.edit}
      </Button>
    ) : null,
    canDeactivate && active ? (
      <Button
        key="deactivate"
        size="small"
        color="error"
        onClick={onDeactivate}
      >
        {content.deactivate}
      </Button>
    ) : null,
    canDeactivate && !active && patientActive ? (
      <Button
        key="reactivate"
        size="small"
        variant="outlined"
        onClick={onReactivate}
      >
        {content.reactivate}
      </Button>
    ) : null,
  ].filter(Boolean);

  return (
    <Card
      component="article"
      aria-labelledby={titleId}
      sx={{
        p: { xs: 2, md: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Typography
          id={titleId}
          variant="h3"
          component="h3"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {medication.name}
        </Typography>
        <Chip
          size="small"
          label={content.status[medication.status]}
          color={active ? 'success' : 'default'}
          variant={active ? 'filled' : 'outlined'}
        />
      </Stack>
      <Box>
        <Typography variant="h2" component="p">
          {formatDose(
            medication.doseAmount,
            medication.doseUnit,
            doseUnitNames,
          )}
        </Typography>
        <Typography variant="body2">
          {frequencyText(medication.schedule)}
        </Typography>
        {medication.route ? (
          <Typography variant="body2" color="text.secondary">
            {content.route(routeLabels[medication.route])}
          </Typography>
        ) : null}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" component="p">
          {periodText(medication, now)}
        </Typography>
        {medication.nextScheduledAt ? (
          <Typography variant="caption" color="text.secondary" component="p">
            {content.next(formatDateTime(medication.nextScheduledAt))}
          </Typography>
        ) : null}
        {active ? (
          <Typography variant="caption" color="text.secondary" component="p">
            {medication.remindersEnabled
              ? content.remindersOn
              : content.remindersOff}
          </Typography>
        ) : null}
      </Box>
      {medication.notes ? (
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {medication.notes}
        </Typography>
      ) : null}
      {medication.scheduleConflicts.length > 0 ? (
        <Alert severity="warning" sx={{ py: 0 }}>
          {content.conflict(medication.scheduleConflicts)}
        </Alert>
      ) : null}
      {actions.length > 0 ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 'auto', justifyContent: 'flex-end' }}
        >
          {actions}
        </Stack>
      ) : null}
    </Card>
  );
}

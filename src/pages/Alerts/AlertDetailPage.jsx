import { Alert, Box, Button, Link, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import DefinitionList from '../../components/DefinitionList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SeverityChip from '../../components/SeverityChip.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import {
  PATHS,
  alertsPath,
  formPath,
  medicationsPath,
  patientPath,
  recordPath,
} from '../../constants/routes.js';
import {
  alertDetailContent as content,
  alertListContent,
  alertOperatorLabels,
  alertSourceLabels,
  alertStatusLabels,
  frequencyUnitNames,
} from '../../data/alertPages.js';
import { navLabels } from '../../data/navigation.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { getAlert } from '../../services/alertService.js';
import { formatDateTime, formatNumber } from '../../utils/format.js';
import ResolveAlertButton from './ResolveAlertButton.jsx';

const withUnit = (value, unit) => (unit ? `${value} ${unit}` : value);

function routerLink(to, label) {
  return (
    <Link component={RouterLink} to={to}>
      {label}
    </Link>
  );
}

function Summary({ alert }) {
  const { summary } = content;
  const rows = [
    [
      summary.patient,
      routerLink(patientPath(alert.patient.id), alert.patient.name),
    ],
    [
      summary.severity,
      <SeverityChip key="severity" severity={alert.severity} />,
    ],
    [summary.status, alertStatusLabels[alert.status]],
    [summary.source, alertSourceLabels[alert.source]],
    [summary.generatedAt, formatDateTime(alert.generatedAt)],
    [summary.message, alert.message],
  ];
  if (alert.resolution) {
    rows.push([
      summary.resolution,
      alertListContent.resolvedBy(
        alert.resolution.resolvedBy.name,
        formatDateTime(alert.resolution.resolvedAt),
      ),
    ]);
  }
  return (
    <SectionCard title={summary.title}>
      <DefinitionList rows={rows} />
    </SectionCard>
  );
}

function Reading({ alert }) {
  const { reading } = content;
  const { field } = alert;
  const visit = (
    <Stack spacing={0.5}>
      {routerLink(
        recordPath(alert.followUp.id),
        reading.visit(formatDateTime(alert.followUp.visitedAt)),
      )}
      {alert.followUp.status === 'annulled' ? (
        <Typography variant="caption" color="text.secondary">
          {reading.annulled}
        </Typography>
      ) : null}
    </Stack>
  );
  return (
    <SectionCard title={reading.title}>
      <DefinitionList
        rows={[
          [reading.field, field.name],
          [
            reading.value,
            withUnit(formatNumber(Number(alert.value)), field.unit),
          ],
          [
            reading.condition,
            `${alertOperatorLabels[alert.operator]} ${withUnit(formatNumber(alert.referenceValue), field.unit)}`,
          ],
          [reading.rule, alert.rule.name],
          [reading.followUp, visit],
        ]}
      />
    </SectionCard>
  );
}

function Absence({ alert }) {
  const { can } = useSession();
  const { absence } = content;
  const { form, since, dueAt, frequency } = alert.absence;
  const unit = frequencyUnitNames[frequency.unit];
  return (
    <SectionCard title={absence.title}>
      <DefinitionList
        rows={[
          [
            absence.form,
            can(P.FORMS_READ)
              ? routerLink(formPath(form.id), form.name)
              : form.name,
          ],
          [absence.since, formatDateTime(since)],
          [absence.dueAt, formatDateTime(dueAt)],
          [
            absence.frequency,
            absence.every(
              frequency.interval,
              frequency.interval > 1 ? unit.many : unit.one,
            ),
          ],
        ]}
      />
    </SectionCard>
  );
}

function Reminder({ alert }) {
  const { reminder } = content;
  const { medication, scheduledAt } = alert.medicationReminder;
  return (
    <SectionCard title={reminder.title}>
      <Stack spacing={2}>
        <DefinitionList
          rows={[
            [reminder.medication, medication.name],
            [reminder.scheduledAt, formatDateTime(scheduledAt)],
          ]}
        />
        <Box>
          <Button
            component={RouterLink}
            to={medicationsPath(alert.patient.id)}
            variant="outlined"
            size="small"
          >
            {reminder.openMedications}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}

const ORIGIN = {
  reading: Reading,
  absence: Absence,
  medication_reminder: Reminder,
};

function AlertDetail({ alert, onResolved }) {
  const { can } = useSession();
  const Origin = ORIGIN[alert.source];
  return (
    <>
      <PageHeader
        title={alert.title}
        subtitle={alert.patient.name}
        breadcrumbs={[
          { label: navLabels.alerts, to: alertsPath(alert.patient.id) },
        ]}
        actions={
          can(P.ALERTS_RESOLVE) && alert.status === 'open' ? (
            <ResolveAlertButton
              alert={alert}
              variant="contained"
              onResolved={onResolved}
            />
          ) : null
        }
      />
      <Stack spacing={2.5}>
        <Summary alert={alert} />
        <Origin alert={alert} />
      </Stack>
    </>
  );
}

/** Detalhe de um alerta, com o bloco da origem e a resolução (UC13, passo 5). */
export default function AlertDetailPage() {
  const { alertId } = useParams();
  const load = useCallback(() => getAlert(alertId), [alertId]);
  const resource = useResource(load);
  const [notice, setNotice] = useState(null);

  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Typography color="text.secondary">{content.notFoundText}</Typography>
        <Box>
          <Button component={RouterLink} to={PATHS.ALERTS} variant="contained">
            {content.backToAlerts}
          </Button>
        </Box>
      </Stack>
    );
  }

  function resolved({ alreadyResolved }) {
    setNotice(
      alreadyResolved
        ? { severity: 'info', text: alertListContent.alreadyResolved }
        : { severity: 'success', text: alertListContent.resolved },
    );
    resource.retry();
  }

  return (
    <Stack spacing={2.5}>
      {notice ? (
        <Alert severity={notice.severity} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}
      <ResourceState resource={resource}>
        {(alert) => <AlertDetail alert={alert} onResolved={resolved} />}
      </ResourceState>
    </Stack>
  );
}

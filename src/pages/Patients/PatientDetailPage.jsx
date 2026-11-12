import {
  Box,
  Button,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PatientSummary from '../../components/PatientSummary.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { SEVERITY_TONE } from '../../constants/alerts.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import {
  PATHS,
  alertsPath,
  medicationsPath,
  patientPath,
} from '../../constants/routes.js';
import { doseUnitNames } from '../../data/medicationPages.js';
import { navLabels } from '../../data/navigation.js';
import { patientDetailContent as content } from '../../data/patientDetail.js';
import {
  patientFieldLabels as labels,
  maskedFieldText,
  severityLabels,
} from '../../data/patientFields.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  deactivatePatient,
  getPatient,
  getPatientOverview,
  reactivatePatient,
} from '../../services/patientService.js';
import {
  formatDate,
  formatDateTime,
  formatDose,
  formatNumber,
  isMasked,
} from '../../utils/format.js';
import { maskZipCode } from '../../utils/masks.js';
import CareTeamSection from './CareTeamSection.jsx';

function withUnit(value, unit) {
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}

function Counts({ overview }) {
  const items = [
    [content.counts.validFollowUps, overview.counts.validFollowUps],
    [content.counts.openAlerts, overview.counts.openAlerts],
    [content.counts.activeMedications, overview.counts.activeMedications],
    [
      content.counts.lastVisitedAt,
      overview.lastVisitedAt
        ? formatDate(overview.lastVisitedAt.slice(0, 10))
        : content.counts.never,
    ],
  ].filter(([, value]) => value !== null);
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr 1fr',
          md: `repeat(${items.length}, 1fr)`,
        },
      }}
    >
      {items.map(([label, value]) => (
        <Card key={label} sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {value}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}

// No celular, a coluna dos valores anteriores sai: o último valor é o que
// importa na visita, e a série completa está no histórico.
const PREVIOUS_COLUMN = { display: { xs: 'none', sm: 'table-cell' } };

function Measurements({ measurements }) {
  if (measurements.length === 0) {
    return (
      <Typography color="text.secondary">
        {content.measurements.empty}
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{content.measurements.parameter}</TableCell>
            <TableCell>{content.measurements.latest}</TableCell>
            <TableCell sx={PREVIOUS_COLUMN}>
              {content.measurements.previous}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {measurements.map((item) => {
            const [latest, ...previous] = item.values;
            return (
              <TableRow key={item.fieldKey}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.form.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {withUnit(latest.value, item.unit)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(latest.visitedAt)}
                  </Typography>
                </TableCell>
                <TableCell sx={PREVIOUS_COLUMN}>
                  <Typography variant="body2" color="text.secondary">
                    {previous
                      .map((value) => formatNumber(value.value))
                      .join(' · ')}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function Medications({ medications }) {
  if (medications.length === 0) {
    return (
      <Typography color="text.secondary">
        {content.medications.empty}
      </Typography>
    );
  }
  return (
    <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {medications.map((medication) => (
        <Box component="li" key={medication.id}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {medication.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDose(
              medication.doseAmount,
              medication.doseUnit,
              doseUnitNames,
            )}{' '}
            · {content.medications.times(medication.schedule.times)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function Alerts({ alerts }) {
  if (alerts.length === 0) {
    return (
      <Typography color="text.secondary">{content.alerts.empty}</Typography>
    );
  }
  return (
    <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {alerts.map((alert) => (
        <Stack component="li" key={alert.id} direction="row" spacing={1.25}>
          <Box
            aria-hidden="true"
            sx={{
              width: 10,
              height: 10,
              mt: 0.75,
              borderRadius: '50%',
              bgcolor: `${SEVERITY_TONE[alert.severity]}.main`,
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              {alert.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {severityLabels[alert.severity]} ·{' '}
              {formatDateTime(alert.generatedAt)} ·{' '}
              {alert.status === 'resolved'
                ? content.alerts.resolved
                : content.alerts.open}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

function fieldText(value) {
  if (isMasked(value)) {
    return maskedFieldText;
  }
  return value || content.registration.empty;
}

function Registration({ patient }) {
  const { address } = patient;
  const masked = isMasked(address.street);
  const addressText = masked
    ? maskedFieldText
    : [
        [address.street, address.number].filter(Boolean).join(', '),
        address.complement,
        address.district,
        [address.city, address.state].filter(Boolean).join(' – '),
        address.zipCode ? maskZipCode(address.zipCode) : null,
      ]
        .filter(Boolean)
        .join(' · ') || content.registration.empty;
  const rows = [
    [labels.birthDate, formatDate(patient.birthDate)],
    [labels.phone, fieldText(patient.phone)],
    [labels.email, fieldText(patient.email)],
    [labels.healthPlan, fieldText(patient.healthPlan)],
    ['Endereço', addressText],
    [labels.notes, fieldText(patient.notes)],
  ];
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.5 }}>
      {rows.map(([label, value]) => (
        <Box key={label}>
          <Typography component="dt" variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            sx={{ m: 0, overflowWrap: 'anywhere' }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function Overview({ patientId }) {
  const load = useCallback(() => getPatientOverview(patientId), [patientId]);
  const overview = useResource(load);
  return (
    <ResourceState resource={overview}>
      {(data) => (
        <Stack spacing={2.5}>
          <Counts overview={data} />
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              alignItems: 'start',
            }}
          >
            <SectionCard
              title={content.measurements.title}
              subtitle={content.measurements.subtitle}
            >
              <Measurements measurements={data.measurements} />
            </SectionCard>
            <Stack spacing={2.5}>
              {data.activeMedications ? (
                <SectionCard title={content.medications.title}>
                  <Medications medications={data.activeMedications} />
                </SectionCard>
              ) : null}
              {data.recentAlerts ? (
                <SectionCard
                  title={content.alerts.title}
                  action={
                    <Button
                      component={RouterLink}
                      to={alertsPath(patientId)}
                      size="small"
                    >
                      {content.alerts.viewAll}
                    </Button>
                  }
                >
                  <Alerts alerts={data.recentAlerts} />
                </SectionCard>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      )}
    </ResourceState>
  );
}

function StatusAction({ patient, onChanged }) {
  const [open, setOpen] = useState(false);
  const active = patient.status === 'active';
  const action = useCallback(
    () =>
      active ? deactivatePatient(patient.id) : reactivatePatient(patient.id),
    [active, patient.id],
  );
  const { status, error, submit } = useSubmit(action);
  const dialog = active ? content.deactivateDialog : content.reactivateDialog;

  async function confirm() {
    const outcome = await submit();
    if (!outcome.error) {
      setOpen(false);
      onChanged();
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        color={active ? 'error' : 'primary'}
        onClick={() => setOpen(true)}
      >
        {active ? content.actions.deactivate : content.actions.reactivate}
      </Button>
      <ConfirmDialog
        open={open}
        title={dialog.title}
        text={dialog.text}
        confirmLabel={dialog.confirm}
        tone={active ? 'error' : 'primary'}
        pending={status === 'submitting'}
        error={
          status === 'error'
            ? (content.statusErrors[error.code] ??
              content.statusErrors.unexpected)
            : null
        }
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function PatientDetail({ patient, reload }) {
  const { can } = useSession();
  const active = patient.status === 'active';
  const actions = (
    <>
      {can(P.PATIENT_HISTORY_READ) ? (
        <Button
          component={RouterLink}
          to={patientPath(patient.id, 'history')}
          variant="outlined"
        >
          {content.actions.history}
        </Button>
      ) : null}
      {can(P.MEDICATIONS_READ) ? (
        <Button
          component={RouterLink}
          to={medicationsPath(patient.id)}
          variant="outlined"
        >
          {content.actions.medications}
        </Button>
      ) : null}
      {can(P.PATIENTS_DEACTIVATE) ? (
        <StatusAction patient={patient} onChanged={reload} />
      ) : null}
      {active && can(P.PATIENTS_UPDATE) ? (
        <Button
          component={RouterLink}
          to={patientPath(patient.id, 'edit')}
          variant="contained"
        >
          {content.actions.edit}
        </Button>
      ) : null}
      {active && can(P.FOLLOW_UPS_CREATE) ? (
        <Button
          component={RouterLink}
          to={patientPath(patient.id, 'visit')}
          variant="contained"
        >
          {content.actions.visit}
        </Button>
      ) : null}
    </>
  );
  return (
    <>
      <PageHeader
        title={patient.name}
        breadcrumbs={[{ label: navLabels.patients, to: PATHS.PATIENTS }]}
        actions={actions}
      />
      <Stack spacing={2.5}>
        <PatientSummary patient={patient} />
        {can(P.PATIENT_HISTORY_READ) ? (
          <Overview patientId={patient.id} />
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
            alignItems: 'start',
          }}
        >
          <SectionCard title={content.registration.title}>
            <Registration patient={patient} />
          </SectionCard>
          <CareTeamSection patient={patient} />
        </Box>
      </Stack>
    </>
  );
}

/** Detalhe do paciente (UC07, UC12, Figura 36). */
export default function PatientDetailPage() {
  const { patientId } = useParams();
  const load = useCallback(() => getPatient(patientId), [patientId]);
  const resource = useResource(load);

  // A API responde 404 também para paciente fora do alcance, para não
  // revelar que ele existe; a tela trata os dois casos do mesmo jeito.
  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Typography color="text.secondary">{content.notFoundText}</Typography>
        <Box>
          <Button
            component={RouterLink}
            to={PATHS.PATIENTS}
            variant="contained"
          >
            {content.backToList}
          </Button>
        </Box>
      </Stack>
    );
  }
  return (
    <ResourceState resource={resource}>
      {(patient) => <PatientDetail patient={patient} reload={resource.retry} />}
    </ResourceState>
  );
}

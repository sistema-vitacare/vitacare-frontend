import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useId, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router';
import DefinitionList from '../../components/DefinitionList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { SEVERITY_TONE } from '../../constants/alerts.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, patientPath, recordsPath } from '../../constants/routes.js';
import { followUpDetailContent as content } from '../../data/followUpPages.js';
import { navLabels } from '../../data/navigation.js';
import { severityLabels } from '../../data/patientFields.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { listPatientAlerts } from '../../services/alertService.js';
import { annulFollowUp, getFollowUp } from '../../services/followUpService.js';
import { getPatient } from '../../services/patientService.js';
import { groupBySection } from '../../utils/formEditor.js';
import { formatAnswer, formatDateTime } from '../../utils/format.js';
import AttachmentsSection from './AttachmentsSection.jsx';

const ALERTS_LIMIT = 100;
const MAX_REASON_LENGTH = 500;

function Summary({ record, patient }) {
  const { summary, status } = content;
  return (
    <SectionCard title={summary.title}>
      <DefinitionList
        rows={[
          [
            summary.patient,
            <Link
              key="patient"
              component={RouterLink}
              to={patientPath(patient.id)}
            >
              {patient.name}
            </Link>,
          ],
          [
            summary.form,
            `${record.form.name} (${summary.version(record.form.versionNumber)})`,
          ],
          [summary.visitedAt, formatDateTime(record.visitedAt)],
          [summary.submittedAt, formatDateTime(record.submittedAt)],
          [summary.author, record.author.name],
          [
            summary.status,
            <Chip
              key="status"
              size="small"
              label={status[record.status]}
              color={record.status === 'valid' ? 'success' : 'error'}
              variant={record.status === 'valid' ? 'filled' : 'outlined'}
            />,
          ],
        ]}
      />
    </SectionCard>
  );
}

function Answers({ record }) {
  const groups = groupBySection(record.answers);
  return (
    <SectionCard title={content.answers.title}>
      <Stack
        spacing={2}
        sx={{
          textDecoration:
            record.status === 'annulled' ? 'line-through' : 'none',
        }}
      >
        {groups.map((group) => (
          <Box key={group.section ?? ''} component="section">
            <Typography variant="h3" sx={{ mb: 1 }}>
              {group.section ?? content.answers.noSection}
            </Typography>
            <DefinitionList
              rows={group.items.map((answer) => [
                answer.name,
                formatAnswer(answer, content.answers),
              ])}
            />
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}

// Os alertas que o registro gerou saem da lista de alertas do paciente: a
// resposta do registro não os traz, e o cuidador não lê as regras.
function GeneratedAlerts({ record }) {
  const load = useCallback(
    () =>
      listPatientAlerts({ patientId: record.patientId, limit: ALERTS_LIMIT }),
    [record.patientId],
  );
  const alerts = useResource(load);
  const generated = (alerts.data ?? []).filter(
    (alert) => alert.followUp?.id === record.id,
  );
  return (
    <SectionCard title={content.alerts.title}>
      <ResourceState
        resource={{
          ...alerts,
          status:
            alerts.status === 'success' && generated.length === 0
              ? 'empty'
              : alerts.status,
        }}
        emptyText={content.alerts.empty}
      >
        {() => (
          <Stack
            component="ul"
            spacing={1.5}
            sx={{ m: 0, p: 0, listStyle: 'none' }}
          >
            {generated.map((alert) => (
              <Stack
                component="li"
                key={alert.id}
                direction="row"
                spacing={1.25}
              >
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
                  <Typography variant="body2">{alert.message}</Typography>
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
        )}
      </ResourceState>
    </SectionCard>
  );
}

function AnnulAction({ record, onAnnulled }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const action = useCallback(
    (text) => annulFollowUp(record.id, { reason: text }),
    [record.id],
  );
  const { status, error, submit } = useSubmit(action);
  const { annul } = content;

  async function confirm(event) {
    event.preventDefault();
    const text = reason.trim();
    if (!text || text.length > MAX_REASON_LENGTH) {
      setReasonError(text ? annul.tooLong : annul.required);
      return;
    }
    const outcome = await submit(text);
    if (!outcome.error) {
      setOpen(false);
      onAnnulled(outcome.data);
    }
  }

  return (
    <>
      <Button variant="outlined" color="error" onClick={() => setOpen(true)}>
        {annul.action}
      </Button>
      <Dialog
        open={open}
        onClose={status === 'submitting' ? undefined : () => setOpen(false)}
        aria-labelledby={titleId}
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" noValidate onSubmit={confirm}>
          <DialogTitle id={titleId}>{annul.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{annul.text}</DialogContentText>
            <TextField
              label={annul.reason}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              error={Boolean(reasonError)}
              helperText={reasonError ?? annul.reasonHelper}
              required
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 2 }}
            />
            {status === 'error' ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {annul.errors[error.code] ?? annul.errors.unexpected}
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpen(false)}
              disabled={status === 'submitting'}
            >
              {annul.cancel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              loading={status === 'submitting'}
            >
              {annul.confirm}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

function Detail({ initialRecord, created }) {
  const { can, session } = useSession();
  const [record, setRecord] = useState(initialRecord);
  const [annulled, setAnnulled] = useState(false);
  const loadPatient = useCallback(
    () => getPatient(record.patientId),
    [record.patientId],
  );
  const patient = useResource(loadPatient);
  const canAnnul =
    record.status === 'valid' &&
    (can(P.FOLLOW_UPS_ANNUL) ||
      (can(P.FOLLOW_UPS_CREATE) && record.author.id === session.user.id));

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={`${record.form.name} · ${formatDateTime(record.visitedAt)}`}
        breadcrumbs={[
          { label: navLabels.records, to: recordsPath(record.patientId) },
        ]}
        actions={
          canAnnul ? (
            <AnnulAction
              record={record}
              onAnnulled={(data) => {
                setRecord(data);
                setAnnulled(true);
              }}
            />
          ) : null
        }
      />
      <ResourceState resource={patient}>
        {(patientData) => (
          <Stack spacing={2.5}>
            {created ? (
              <Alert severity="success" role="status">
                {content.created}
              </Alert>
            ) : null}
            {annulled ? (
              <Alert severity="success" role="status">
                {content.annul.done}
              </Alert>
            ) : null}
            {record.status === 'annulled' ? (
              <Alert severity="error">
                {content.annulled(
                  record.annulment.annulledBy.name,
                  formatDateTime(record.annulment.annulledAt),
                  record.annulment.reason,
                )}
              </Alert>
            ) : null}
            <Summary record={record} patient={patientData} />
            <Answers record={record} />
            {record.notes ? (
              <SectionCard title={content.notes}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {record.notes}
                </Typography>
              </SectionCard>
            ) : null}
            {can(P.ALERTS_READ) ? <GeneratedAlerts record={record} /> : null}
            <AttachmentsSection
              key={record.status}
              record={record}
              patientActive={patientData.status === 'active'}
            />
          </Stack>
        )}
      </ResourceState>
    </>
  );
}

/** Detalhe do registro de acompanhamento, com anexos e anulação (RF009, RF010). */
export default function FollowUpDetailPage() {
  const { followUpId } = useParams();
  const location = useLocation();
  const load = useCallback(() => getFollowUp(followUpId), [followUpId]);
  const resource = useResource(load);
  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Box>
          <Button component={RouterLink} to={PATHS.RECORDS} variant="contained">
            {content.backToRecords}
          </Button>
        </Box>
      </Stack>
    );
  }
  return (
    <ResourceState resource={resource}>
      {(record) => (
        <Detail
          key={record.id}
          initialRecord={record}
          created={location.state?.created === true}
        />
      )}
    </ResourceState>
  );
}

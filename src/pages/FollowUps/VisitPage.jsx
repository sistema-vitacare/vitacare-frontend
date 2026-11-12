import {
  Alert,
  Box,
  Button,
  Card,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import PatientSummary from '../../components/PatientSummary.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import {
  PATHS,
  patientPath,
  recordPath,
  usesBottomNav,
} from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import { visitRecordContent as content } from '../../data/visitRecord.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { createFollowUp } from '../../services/followUpService.js';
import { getForm, listForms } from '../../services/formService.js';
import { getPatient } from '../../services/patientService.js';
import { checkAnswers } from '../../utils/followUpAnswers.js';
import { groupBySection } from '../../utils/formEditor.js';
import {
  answerErrorsByField,
  answersFrom,
  isFutureVisit,
  localDateTime,
  visitedAtFromLocal,
} from '../../utils/visitForm.js';
import AnswerInput from './AnswerInput.jsx';

const FORMS_LIMIT = 100;
const MAX_NOTES_LENGTH = 2000;

function fieldErrorText(field, code) {
  if (!code) {
    return undefined;
  }
  const message = content.fieldErrors[code];
  if (typeof message === 'function') {
    return message(field.decimalPlaces ?? 0);
  }
  return message ?? content.fieldErrors.fallback;
}

function ActionBar({ pending, onCancel }) {
  const theme = useTheme();
  const { can } = useSession();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  // No celular, a barra fica presa ao pé da tela, acima da barra inferior
  // de quem registra visitas (Figura 40). No computador ela fica no fim do
  // formulário: presa e sem fundo, cobriria os campos ao rolar.
  const offset =
    !isDesktop && usesBottomNav(can)
      ? `calc(${theme.spacing(7)} + env(safe-area-inset-bottom))`
      : 0;
  return (
    <Paper
      elevation={0}
      sx={{
        position: isDesktop ? 'static' : 'sticky',
        bottom: offset,
        zIndex: 1,
        py: 1.5,
        px: { xs: 2, md: 0 },
        mx: { xs: -2, md: 0 },
        borderTop: { xs: 1, md: 0 },
        borderColor: 'divider',
        bgcolor: { xs: 'background.paper', md: 'transparent' },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: { md: 'flex-end' } }}
      >
        <Button
          onClick={onCancel}
          variant="outlined"
          disabled={pending}
          sx={{ flex: { xs: 1, md: 'none' } }}
        >
          {content.cancel}
        </Button>
        <Button
          type="submit"
          variant="contained"
          loading={pending}
          sx={{ flex: { xs: 1, md: 'none' } }}
        >
          {content.save}
        </Button>
      </Stack>
    </Paper>
  );
}

/**
 * Campos da versão vigente do formulário, por seção, sem os desabilitados,
 * com a data da visita e as observações. Salvar abre o registro gravado,
 * que mostra os alertas que ele gerou.
 */
function VisitForm({ patient, form, onReload }) {
  const navigate = useNavigate();
  const version = form.currentVersion;
  const fields = version.fields.filter(
    (field) => field.requirement !== 'disabled',
  );
  const [values, setValues] = useState({});
  const [visitedAt, setVisitedAt] = useState(() => localDateTime());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [outdated, setOutdated] = useState(false);
  const action = useCallback((body) => createFollowUp(body), []);
  const { status, submit } = useSubmit(action);

  function change(fieldId, value) {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => ({ ...current, [fieldId]: undefined }));
  }

  async function save(event) {
    event.preventDefault();
    const answers = answersFrom(fields, values);
    const check = checkAnswers(fields, answers);
    const found = answerErrorsByField(fields, check);
    if (!visitedAt || isFutureVisit(visitedAt)) {
      found.visitedAt = content.errors.future;
    }
    if (notes.trim().length > MAX_NOTES_LENGTH) {
      found.notes = content.errors.notesTooLong;
    }
    setErrors(found);
    if (check.kind === 'empty') {
      setFormError(content.errors.empty);
      return;
    }
    if (Object.keys(found).length > 0) {
      setFormError(content.errors.invalid);
      return;
    }
    setFormError(null);
    const { data, error } = await submit({
      patientId: patient.id,
      formId: form.id,
      formVersionId: version.id,
      visitedAt: visitedAtFromLocal(visitedAt),
      notes: notes.trim() || null,
      answers,
    });
    if (!error) {
      navigate(recordPath(data.id), { state: { created: true } });
      return;
    }
    if (error.code === 'FOLLOW_UP_FORM_VERSION_OUTDATED') {
      setOutdated(true);
      return;
    }
    if (error.code === 'FOLLOW_UP_INVALID_VISITED_AT') {
      setErrors((current) => ({
        ...current,
        visitedAt: content.errors.future,
      }));
    }
    if (error.code === 'FOLLOW_UP_INVALID_ANSWERS') {
      setErrors(
        answerErrorsByField(fields, { kind: 'invalid', errors: error.fields }),
      );
    }
    setFormError(
      content.errors[error.code] ??
        (error.code === 'FOLLOW_UP_EMPTY'
          ? content.errors.empty
          : error.status === 422
            ? content.errors.invalid
            : content.errors.unexpected),
    );
  }

  return (
    <Box component="form" noValidate onSubmit={save}>
      <Stack spacing={2.5}>
        {groupBySection(fields).map((group) => (
          <Card
            key={group.section ?? ''}
            component="section"
            sx={{ p: { xs: 2, md: 3 } }}
          >
            <Typography variant="h2" sx={{ mb: 2 }}>
              {group.section ?? content.noSection}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              {group.items.map((field) => (
                <Box
                  key={field.id}
                  sx={{
                    gridColumn: ['number'].includes(field.fieldType)
                      ? 'auto'
                      : '1 / -1',
                  }}
                >
                  <AnswerInput
                    field={field}
                    value={values[field.id] ?? null}
                    error={fieldErrorText(field, errors[field.id])}
                    onChange={(value) => change(field.id, value)}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        ))}
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <TextField
              type="datetime-local"
              label={content.visitedAt}
              value={visitedAt}
              onChange={(event) => {
                setVisitedAt(event.target.value);
                setErrors((current) => ({ ...current, visitedAt: undefined }));
              }}
              error={Boolean(errors.visitedAt)}
              helperText={errors.visitedAt ?? content.visitedAtHelper}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: localDateTime() },
              }}
              sx={{ maxWidth: { sm: 320 } }}
            />
            <TextField
              label={content.notes}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              error={Boolean(errors.notes)}
              helperText={errors.notes ?? content.notesHelper}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </Card>
        {outdated ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={onReload}>
                {content.errors.reload}
              </Button>
            }
          >
            {content.errors.outdated}
          </Alert>
        ) : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        <ActionBar
          pending={status === 'submitting'}
          onCancel={() => navigate(patientPath(patient.id))}
        />
      </Stack>
    </Box>
  );
}

function FormChoice({ patient, forms }) {
  const [formId, setFormId] = useState(forms.length === 1 ? forms[0].id : '');
  const load = useCallback(
    () =>
      formId ? getForm(formId) : Promise.resolve({ data: null, meta: {} }),
    [formId],
  );
  const form = useResource(load);
  return (
    <Stack spacing={2.5}>
      {forms.length > 1 ? (
        <TextField
          select
          label={content.form}
          value={formId}
          onChange={(event) => setFormId(event.target.value)}
          helperText={formId ? undefined : content.chooseForm}
          sx={{ maxWidth: { sm: 420 } }}
        >
          {forms.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {content.form}
          </Typography>
          <Typography sx={{ fontWeight: 700 }}>{forms[0].name}</Typography>
        </Box>
      )}
      {formId ? (
        <ResourceState resource={form}>
          {(data) => (
            <VisitForm
              key={data.currentVersion.id}
              patient={patient}
              form={data}
              onReload={form.retry}
            />
          )}
        </ResourceState>
      ) : null}
    </Stack>
  );
}

function Visit({ patient }) {
  const load = useCallback(
    () => listForms({ patientId: patient.id, limit: FORMS_LIMIT }),
    [patient.id],
  );
  const forms = useResource(load);
  const back = (
    <Box>
      <Button
        component={RouterLink}
        to={patientPath(patient.id)}
        variant="outlined"
      >
        {content.backToPatient}
      </Button>
    </Box>
  );
  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={patient.name}
        breadcrumbs={[
          { label: navLabels.patients, to: PATHS.PATIENTS },
          { label: patient.name, to: patientPath(patient.id) },
        ]}
      />
      <Stack spacing={2.5}>
        <PatientSummary patient={patient} />
        {patient.status !== 'active' ? (
          <>
            <Alert severity="warning">{content.inactive}</Alert>
            {back}
          </>
        ) : (
          <ResourceState resource={forms} emptyText={content.noForms}>
            {(items) => <FormChoice patient={patient} forms={items} />}
          </ResourceState>
        )}
      </Stack>
    </>
  );
}

/** Registro de visita (UC11, Figuras 38 e 40), pensado primeiro para o celular. */
export default function VisitPage() {
  const { patientId } = useParams();
  const load = useCallback(() => getPatient(patientId), [patientId]);
  const resource = useResource(load);
  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
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
      {(patient) => <Visit patient={patient} />}
    </ResourceState>
  );
}

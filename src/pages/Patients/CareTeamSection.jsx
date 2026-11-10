import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useId, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { careTeamContent as content } from '../../data/careTeam.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  createPatientLink,
  listEligibleUsers,
  listPatientLinks,
  revokePatientLink,
  updatePatientLink,
} from '../../services/patientLinkService.js';
import { initials } from '../../utils/initials.js';

const LINK_TYPE_MAX = 40;
const NOTE_MAX = 500;
const CARE_ROLES = ['caregiver', 'family'];

const errorText = (error) =>
  content.errors[error?.code] ?? content.errors.unexpected;

// Texto opcional vazio vai como null: a API recusa "".
const textOrNull = (value) => value.trim() || null;

function LinkDialog({ patient, link, onClose, onSaved }) {
  const titleId = useId();
  const editing = Boolean(link);
  const [values, setValues] = useState({
    role: link?.role ?? 'caregiver',
    userId: link?.user.id ?? '',
    linkType: link?.linkType ?? '',
    note: link?.note ?? '',
  });
  const [errors, setErrors] = useState({});
  const loadUsers = useCallback(
    () => listEligibleUsers({ role: values.role, limit: 100 }),
    [values.role],
  );
  const users = useResource(loadUsers);
  const action = useCallback(
    (body) =>
      editing ? updatePatientLink(link.id, body) : createPatientLink(body),
    [editing, link],
  );
  const { status, error, submit } = useSubmit(action);

  function change(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
      // Trocar o papel troca a lista de pessoas.
      ...(name === 'role' ? { userId: '' } : {}),
    }));
    setErrors((current) => ({ ...current, [name]: null }));
  }

  async function handleSave() {
    const found = {};
    if (!editing && !values.userId) {
      found.userId = content.dialog.userRequired;
    }
    if (values.linkType.trim().length > LINK_TYPE_MAX) {
      found.linkType = content.dialog.tooLong(LINK_TYPE_MAX);
    }
    if (values.note.trim().length > NOTE_MAX) {
      found.note = content.dialog.tooLong(NOTE_MAX);
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    const body = {
      linkType: textOrNull(values.linkType),
      note: textOrNull(values.note),
    };
    const outcome = await submit(
      editing
        ? body
        : { ...body, patientId: patient.id, userId: values.userId },
    );
    if (!outcome.error) {
      onSaved();
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={titleId}>
        {editing ? content.dialog.editTitle : content.dialog.addTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {status === 'error' ? (
            <Alert severity="error">{errorText(error)}</Alert>
          ) : null}
          {editing ? (
            <Typography>
              {link.user.name} · {content.roles[link.role]}
            </Typography>
          ) : (
            <>
              <TextField
                select
                label={content.dialog.role}
                value={values.role}
                onChange={(event) => change('role', event.target.value)}
                fullWidth
              >
                {CARE_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {content.roles[role]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={content.dialog.user}
                value={values.userId}
                onChange={(event) => change('userId', event.target.value)}
                error={Boolean(errors.userId)}
                helperText={errors.userId ?? content.dialog.userHelper}
                fullWidth
              >
                {(users.data ?? []).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                    {user.status === 'pending' ? ` (${content.pending})` : ''}
                  </MenuItem>
                ))}
                {users.status === 'empty' ? (
                  <MenuItem disabled value="">
                    {content.dialog.noUsers}
                  </MenuItem>
                ) : null}
              </TextField>
            </>
          )}
          <TextField
            label={content.dialog.linkType}
            value={values.linkType}
            onChange={(event) => change('linkType', event.target.value)}
            error={Boolean(errors.linkType)}
            helperText={errors.linkType ?? content.dialog.linkTypeHelper}
            fullWidth
          />
          <TextField
            label={content.dialog.note}
            value={values.note}
            onChange={(event) => change('note', event.target.value)}
            error={Boolean(errors.note)}
            helperText={errors.note}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={status === 'submitting'}>
          {content.dialog.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          loading={status === 'submitting'}
        >
          {content.dialog.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Member({ link, onEdit, onRevoke }) {
  const responsible = link.role === 'responsible_professional';
  return (
    <Stack
      component="li"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        alignItems: { sm: 'center' },
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
      >
        <Avatar
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.8125rem',
            fontWeight: 700,
            bgcolor: 'primary.light',
            color: 'primary.dark',
          }}
        >
          {initials(link.user.name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Typography sx={{ fontWeight: 650 }}>{link.user.name}</Typography>
            <Chip size="small" label={content.roles[link.role]} />
            {link.user.status === 'pending' ? (
              <Chip size="small" variant="outlined" label={content.pending} />
            ) : null}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {responsible
              ? content.responsibleHint
              : [link.linkType, link.note].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
      </Stack>
      {responsible ? null : (
        <Stack direction="row" spacing={1} sx={{ pl: { xs: 6, sm: 0 } }}>
          <Button size="small" onClick={() => onEdit(link)}>
            {content.edit}
          </Button>
          <Button size="small" color="error" onClick={() => onRevoke(link)}>
            {content.revoke}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

// A lista só carrega para quem gerencia vínculos: o cartão separado evita
// chamar os hooks dele quando a seção não aparece.
function CareTeamCard({ patient }) {
  const titleId = useId();
  const [dialog, setDialog] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const load = useCallback(
    () => listPatientLinks({ patientId: patient.id, limit: 100 }),
    [patient.id],
  );
  const links = useResource(load);
  const revoke = useSubmit(revokePatientLink);
  const inactive = patient.status === 'inactive';
  const reload = links.retry;

  async function confirmRevoke() {
    const outcome = await revoke.submit(revoking.id);
    if (!outcome.error) {
      setRevoking(null);
      reload();
    }
  }

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'flex-start' },
          mb: 1,
        }}
      >
        <Box>
          <Typography id={titleId} variant="h2">
            {content.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {inactive ? content.inactivePatient : content.subtitle}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          disabled={inactive}
          onClick={() => setDialog({ link: null })}
        >
          {content.add}
        </Button>
      </Stack>
      <ResourceState resource={links} emptyText={content.empty}>
        {(items) => (
          <Box
            component="ul"
            aria-labelledby={titleId}
            sx={{ m: 0, p: 0, listStyle: 'none' }}
          >
            {items.map((link) => (
              <Member
                key={link.id}
                link={link}
                onEdit={(item) => setDialog({ link: item })}
                onRevoke={setRevoking}
              />
            ))}
          </Box>
        )}
      </ResourceState>

      {dialog ? (
        <LinkDialog
          patient={patient}
          link={dialog.link}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(revoking)}
        title={content.revokeDialog.title}
        text={revoking ? content.revokeDialog.text(revoking.user.name) : ''}
        confirmLabel={content.revokeDialog.confirm}
        tone="error"
        pending={revoke.status === 'submitting'}
        error={revoke.status === 'error' ? content.revokeDialog.error : null}
        onConfirm={confirmRevoke}
        onClose={() => setRevoking(null)}
      />
    </Card>
  );
}

/**
 * Equipe de cuidado do paciente (RF004, RF005, UC03 passo 4): responsável,
 * cuidadores e familiares. Só aparece para quem gerencia vínculos.
 */
export default function CareTeamSection({ patient }) {
  const { can } = useSession();
  return can(P.PATIENT_LINKS_MANAGE) ? (
    <CareTeamCard patient={patient} />
  ) : null;
}

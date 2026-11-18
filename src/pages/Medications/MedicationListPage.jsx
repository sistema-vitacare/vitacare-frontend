import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { Plus } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { medicationListContent as content } from '../../data/medicationPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  deactivateMedication,
  listMedications,
  reactivateMedication,
} from '../../services/medicationService.js';
import MedicationCard from './MedicationCard.jsx';
import MedicationDialog from './MedicationDialog.jsx';

// A API devolve até 100 por página; um paciente com mais que isso não é o
// caso desta tela.
const MEDICATIONS_LIMIT = 100;

function PatientMedications({ patient }) {
  const { can } = useSession();
  const patientActive = patient.status === 'active';
  const canCreate = can(P.MEDICATIONS_CREATE) && patientActive;
  const load = useCallback(
    () => listMedications({ patientId: patient.id, limit: MEDICATIONS_LIMIT }),
    [patient.id],
  );
  const medications = useResource(load);
  // `null` fechado; `{ medication: null }` cadastro; com medicamento, edição.
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [actionError, setActionError] = useState(null);

  const changeStatus = useCallback(
    ({ medication, active }) =>
      active
        ? reactivateMedication(medication.id)
        : deactivateMedication(medication.id),
    [],
  );
  const statusChange = useSubmit(changeStatus);

  async function setActive(medication, active) {
    setActionError(null);
    const { data, error } = await statusChange.submit({ medication, active });
    if (data) {
      setDeactivating(null);
      setNotice({ text: active ? content.reactivated : content.deactivated });
      medications.retry();
      return;
    }
    setActionError(content.errors[error.code] ?? content.unexpected);
  }

  function saved(medication) {
    setEditing(null);
    setNotice({ text: content.saved, conflicts: medication.scheduleConflicts });
    medications.retry();
  }

  return (
    <Stack spacing={2.5}>
      {!patientActive ? (
        <Alert severity="info">{content.inactivePatient}</Alert>
      ) : null}
      {notice ? (
        <Stack spacing={1}>
          <Alert severity="success" onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
          {notice.conflicts?.length > 0 ? (
            <Alert severity="warning">
              {content.conflicts(notice.conflicts)}
            </Alert>
          ) : null}
        </Stack>
      ) : null}
      {actionError && !deactivating ? (
        <Alert severity="error">{actionError}</Alert>
      ) : null}
      <ResourceState resource={medications} emptyText={content.empty}>
        {(items, meta) => (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {content.count(meta.pagination.total)}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              {items.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  canEdit={can(P.MEDICATIONS_UPDATE)}
                  canDeactivate={can(P.MEDICATIONS_DEACTIVATE)}
                  patientActive={patientActive}
                  onEdit={() => setEditing({ medication })}
                  onDeactivate={() => {
                    setActionError(null);
                    setDeactivating(medication);
                  }}
                  onReactivate={() => setActive(medication, true)}
                />
              ))}
            </Box>
          </Stack>
        )}
      </ResourceState>
      {canCreate ? (
        <Box>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setEditing({ medication: null })}
          >
            {content.add}
          </Button>
        </Box>
      ) : null}
      {editing ? (
        <MedicationDialog
          patient={patient}
          medication={editing.medication}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      ) : null}
      <ConfirmDialog
        open={deactivating !== null}
        title={content.deactivateDialog.title(deactivating?.name ?? '')}
        text={content.deactivateDialog.text}
        confirmLabel={content.deactivateDialog.confirm}
        tone="error"
        pending={statusChange.status === 'submitting'}
        error={deactivating ? actionError : null}
        onConfirm={() => setActive(deactivating, false)}
        onClose={() => setDeactivating(null)}
      />
    </Stack>
  );
}

/** Medicamentos de um paciente (menu Medicamentos; RF007, UC08, Figura 41). */
export default function MedicationListPage() {
  return (
    <>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <PatientPicker content={content.picker}>
        {(patient) => <PatientMedications key={patient.id} patient={patient} />}
      </PatientPicker>
    </>
  );
}

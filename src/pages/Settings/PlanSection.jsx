import { Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PlanSummary from '../../components/PlanSummary.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { planSectionContent as content } from '../../data/settingsPages.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { cancelChangeRequest } from '../../services/organizationService.js';
import { formatDateTime } from '../../utils/format.js';
import ChangeRequestDialog from './ChangeRequestDialog.jsx';

function PendingRequest({ request, canCancel, onCancel }) {
  return (
    <Box
      sx={{ p: 2, borderRadius: 1, bgcolor: 'background.default' }}
      aria-label={content.pendingTitle}
      role="group"
    >
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {content.pendingTitle}
      </Typography>
      <Typography variant="body2">
        {content.pending(
          request.currentPlan.name,
          request.requestedPlan.name,
          formatDateTime(request.createdAt),
        )}
      </Typography>
      {request.notes ? (
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {content.notes(request.notes)}
        </Typography>
      ) : null}
      {canCancel ? (
        <Button size="small" color="error" onClick={onCancel} sx={{ mt: 1 }}>
          {content.cancel}
        </Button>
      ) : null}
    </Box>
  );
}

/**
 * Plano e uso (UC04; Figura 46): plano com descrição e recursos, vigência,
 * o aviso de vencimento que a API manda, limites e uso de usuários e
 * pacientes e a solicitação de mudança em análise, que pode ser cancelada,
 * ou o pedido de uma nova. A API aceita uma solicitação em análise por vez.
 */
export default function PlanSection({ data, meta, onChanged }) {
  const { can } = useSession();
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { plan, term, pendingChangeRequest: pending } = data;
  const cancelAction = useCallback(
    () => cancelChangeRequest(pending.id),
    [pending],
  );
  const cancel = useSubmit(cancelAction);
  const manage = can(P.PLAN_CHANGE_REQUESTS_CREATE);
  const expired = term.status === 'expired';

  async function confirmCancel() {
    const outcome = await cancel.submit();
    if (outcome.data) {
      setCancelling(false);
      onChanged(content.cancelled);
    }
  }

  return (
    <Box component="section" aria-label={content.title}>
      <SectionCard
        title={content.title}
        action={
          manage && !pending ? (
            <Button variant="outlined" onClick={() => setRequesting(true)}>
              {content.request}
            </Button>
          ) : null
        }
      >
        <Stack spacing={2.5}>
          <PlanSummary data={data} meta={meta} />
          {pending ? (
            <PendingRequest
              request={pending}
              canCancel={manage}
              onCancel={() => setCancelling(true)}
            />
          ) : null}
        </Stack>
      </SectionCard>

      {requesting ? (
        <ChangeRequestDialog
          currentPlanId={plan.id}
          expired={expired}
          onClose={() => setRequesting(false)}
          onSent={() => {
            setRequesting(false);
            onChanged(content.sent);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={cancelling}
        title={content.cancelTitle}
        text={content.cancelText}
        confirmLabel={content.cancel}
        cancelLabel={content.keep}
        tone="error"
        pending={cancel.status === 'submitting'}
        error={
          cancel.status === 'error'
            ? (cancel.error?.message ?? content.unexpected)
            : null
        }
        onConfirm={confirmCancel}
        onClose={() => setCancelling(false)}
      />
    </Box>
  );
}

import { Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import PlanSummary from '../../components/PlanSummary.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { organizationPlanContent as content } from '../../data/organizationPlanPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import {
  getOrganizationPlan,
  listPlans,
} from '../../services/organizationService.js';
import { formatDateTime } from '../../utils/format.js';
import PlanTermDialog from './PlanTermDialog.jsx';
import RejectRequestDialog from './RejectRequestDialog.jsx';

function PendingRequest({ request, canDecide, onApprove, onReject }) {
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
      {canDecide ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" variant="contained" onClick={onApprove}>
            {content.approve}
          </Button>
          <Button size="small" color="error" onClick={onReject}>
            {content.reject}
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}

/**
 * Plano de uma organização cliente para a plataforma (UC04): o resumo comum
 * com o aviso de vencimento e o uso, "Atribuir plano" e a solicitação em
 * análise com Aprovar e Recusar, cada um num diálogo. Depois de cada ação o
 * plano recarrega, e `onChanged` recebe o aviso e a severidade para a
 * página; a solicitação que outra pessoa decidiu ou cancelou chega como
 * atenção, com a mensagem da API.
 */
export default function OrganizationPlan({ organizationId, onChanged }) {
  const { can } = useSession();
  const load = useCallback(
    () => getOrganizationPlan(organizationId),
    [organizationId],
  );
  const plan = useResource(load);
  const catalog = useResource(listPlans);
  const [dialog, setDialog] = useState(null);
  const manage = can(P.PLATFORM_ORGANIZATIONS_UPDATE);

  function done(notice, severity = 'success') {
    setDialog(null);
    plan.retry();
    onChanged(notice, severity);
  }

  const stale = (message) => done(message, 'warning');

  const pending = plan.data?.pendingChangeRequest ?? null;

  return (
    <Box component="section" aria-label={content.title}>
      <SectionCard
        title={content.title}
        action={
          manage && plan.data && catalog.data ? (
            <Button variant="outlined" onClick={() => setDialog('assign')}>
              {content.assign}
            </Button>
          ) : null
        }
      >
        <ResourceState resource={plan}>
          {(data, meta) => (
            <Stack spacing={2.5}>
              <PlanSummary data={data} meta={meta} />
              {pending ? (
                <PendingRequest
                  request={pending}
                  canDecide={manage && Boolean(catalog.data)}
                  onApprove={() => setDialog('approve')}
                  onReject={() => setDialog('reject')}
                />
              ) : null}
            </Stack>
          )}
        </ResourceState>
      </SectionCard>

      {dialog === 'assign' || dialog === 'approve' ? (
        <PlanTermDialog
          organizationId={organizationId}
          plans={catalog.data}
          currentPlanId={plan.data.plan.id}
          request={dialog === 'approve' ? pending : null}
          onClose={() => setDialog(null)}
          onSaved={() =>
            done(dialog === 'approve' ? content.approved : content.assigned)
          }
          onStale={stale}
        />
      ) : null}
      {dialog === 'reject' ? (
        <RejectRequestDialog
          request={pending}
          onClose={() => setDialog(null)}
          onRejected={() => done(content.rejected)}
          onStale={stale}
        />
      ) : null}
    </Box>
  );
}

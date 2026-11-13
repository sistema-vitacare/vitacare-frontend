import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import {
  planFeatureLabels,
  planSectionContent as content,
} from '../../data/settingsPages.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { cancelChangeRequest } from '../../services/organizationService.js';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  todayInSaoPaulo,
} from '../../utils/format.js';
import ChangeRequestDialog from './ChangeRequestDialog.jsx';

// Dia de Brasília de um instante da API, como a mensagem de vencimento.
const day = (instant) => formatDate(todayInSaoPaulo(new Date(instant)));

// Uso como a API manda: depois de um rebaixamento, ele pode passar do
// limite, e a barra só fica cheia.
function Usage({ label, used, limit }) {
  return (
    <Box component="li" sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h2" component="p">
        {content.usageValue(formatNumber(used), formatNumber(limit))}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={limit > 0 ? Math.min(100, (used / limit) * 100) : 100}
        color={used >= limit ? 'warning' : 'primary'}
        aria-label={label}
        sx={{ mt: 1, height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

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
  const { plan, term, limits, usage, pendingChangeRequest: pending } = data;
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
          {meta?.message ? (
            <Alert severity={expired ? 'error' : 'warning'}>
              {meta.message}
            </Alert>
          ) : null}
          <Box>
            <Stack
              direction="row"
              sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}
            >
              <Typography variant="h2" component="p">
                {plan.name}
              </Typography>
              {expired ? (
                <Chip
                  size="small"
                  label={content.expired}
                  sx={{ bgcolor: 'error.light', color: 'error.main' }}
                />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {plan.description}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {content.term(
                day(term.startsAt),
                term.endsAt ? day(term.endsAt) : null,
              )}
            </Typography>
          </Box>
          <Box
            component="ul"
            aria-label={content.featuresLabel}
            sx={{
              m: 0,
              pl: 2.5,
              display: 'grid',
              gap: 0.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            {plan.features.map((feature) => (
              <Typography component="li" variant="body2" key={feature}>
                {planFeatureLabels[feature] ?? feature}
              </Typography>
            ))}
          </Box>
          <Box
            component="ul"
            aria-label={content.usageLabel}
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Usage
              label={content.usage.users}
              used={usage.users}
              limit={limits.users}
            />
            <Usage
              label={content.usage.patients}
              used={usage.patients}
              limit={limits.patients}
            />
          </Box>
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

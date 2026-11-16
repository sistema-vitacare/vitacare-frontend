import { Alert, Box, Button, Card, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { organizationPath } from '../../constants/routes.js';
import { pendingRequestsContent as content } from '../../data/organizationPlanPages.js';
import { useResource } from '../../hooks/useResource.js';
import { listChangeRequests } from '../../services/organizationService.js';
import { getOrganization } from '../../services/platformOrganizationService.js';
import { formatDateTime } from '../../utils/format.js';

/**
 * A lista de solicitações traz só o `organizationId`; o nome vem da consulta
 * de cada organização, uma por organização, porque a API aceita uma
 * solicitação em análise por vez em cada uma.
 */
async function loadPending() {
  const requests = await listChangeRequests({ status: 'pending', limit: 100 });
  const ids = [...new Set(requests.data.map((item) => item.organizationId))];
  const names = await Promise.all(
    ids.map((id) =>
      getOrganization(id).then(
        ({ data }) => [id, data.tradeName],
        () => [id, null],
      ),
    ),
  );
  const nameOf = Object.fromEntries(names);
  return {
    data: requests.data.map((item) => ({
      ...item,
      organizationName: nameOf[item.organizationId],
    })),
    meta: requests.meta,
  };
}

/**
 * Fila das solicitações de mudança de plano em análise (UC04), no topo das
 * organizações: cada uma leva à página da organização, onde a plataforma vê
 * plano e uso antes de decidir. Sem solicitação, a seção some.
 */
export default function PendingRequests() {
  const pending = useResource(loadPending);

  if (pending.status === 'error') {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 2.5 }}
        action={
          <Button color="inherit" size="small" onClick={pending.retry}>
            {content.retry}
          </Button>
        }
      >
        {content.unavailable}
      </Alert>
    );
  }
  if (pending.status !== 'success') {
    return null;
  }

  return (
    <Card
      component="section"
      aria-label={content.title}
      sx={{ p: { xs: 2, md: 3 }, mb: 2.5 }}
    >
      <Typography variant="h2" sx={{ mb: 1.5 }}>
        {content.title}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {pending.data.map((request) => (
          <Box
            component="li"
            key={request.id}
            sx={{
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              '&:first-of-type': { borderTop: 0, pt: 0 },
              '&:last-of-type': { pb: 0 },
            }}
          >
            <Link
              component={RouterLink}
              to={organizationPath(request.organizationId)}
              underline="hover"
              sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}
            >
              {request.organizationName ?? content.unknownOrganization}
            </Link>
            <Typography variant="body2">
              {content.change(
                request.currentPlan.name,
                request.requestedPlan.name,
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {content.requestedAt(formatDateTime(request.createdAt))}
            </Typography>
            {request.notes ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {content.notes(request.notes)}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
    </Card>
  );
}

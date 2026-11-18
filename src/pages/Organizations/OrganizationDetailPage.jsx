import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PATHS } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import { organizationDetailContent as content } from '../../data/organizationPlanPages.js';
import { useResource } from '../../hooks/useResource.js';
import { getOrganization } from '../../services/platformOrganizationService.js';
import OrganizationData from './OrganizationData.jsx';
import OrganizationPlan from './OrganizationPlan.jsx';

/**
 * Página de uma organização para a plataforma (UC03 e UC04): dados e
 * situação e, para organização cliente, o plano com a solicitação em
 * análise. O aviso de cada mudança fica no topo.
 */
export default function OrganizationDetailPage() {
  const { organizationId } = useParams();
  const load = useCallback(
    () => getOrganization(organizationId),
    [organizationId],
  );
  const organization = useResource(load);
  const [notice, setNotice] = useState(null);

  if (organization.status === 'error' && organization.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Typography color="text.secondary">{content.notFoundText}</Typography>
        <Box>
          <Button
            component={RouterLink}
            to={PATHS.ORGANIZATIONS}
            variant="contained"
          >
            {content.backToList}
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <ResourceState resource={organization}>
      {(data) => (
        <>
          <PageHeader
            title={data.tradeName}
            breadcrumbs={[
              { label: navLabels.organizations, to: PATHS.ORGANIZATIONS },
            ]}
          />
          <Stack spacing={2.5}>
            {notice ? (
              <Alert severity="success" onClose={() => setNotice(null)}>
                {notice}
              </Alert>
            ) : null}
            <OrganizationData
              organization={data}
              onChanged={(text) => {
                setNotice(text);
                organization.retry();
              }}
            />
            {data.kind === 'platform' ? null : (
              <OrganizationPlan
                organizationId={data.id}
                onChanged={setNotice}
              />
            )}
          </Stack>
        </>
      )}
    </ResourceState>
  );
}

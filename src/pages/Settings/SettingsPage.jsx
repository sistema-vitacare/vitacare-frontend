import { Alert, Box, Button, Stack } from '@mui/material';
import { useState } from 'react';
import DefinitionList from '../../components/DefinitionList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import {
  organizationSectionContent,
  settingsContent as content,
} from '../../data/settingsPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import {
  getOwnOrganization,
  getOwnPlan,
} from '../../services/organizationService.js';
import OrganizationDialog from './OrganizationDialog.jsx';
import PlanSection from './PlanSection.jsx';

const FIELDS = ['code', 'tradeName', 'legalName', 'document', 'phone', 'email'];
const noLoad = () => Promise.resolve({ data: null, meta: {} });

function OrganizationSection({ organization, onEdit }) {
  const { fields, title, edit } = organizationSectionContent;
  return (
    <Box component="section" aria-label={title}>
      <SectionCard
        title={title}
        action={
          onEdit ? (
            <Button variant="outlined" onClick={onEdit}>
              {edit}
            </Button>
          ) : null
        }
      >
        <DefinitionList
          rows={FIELDS.map((field) => [
            fields[field],
            organization[field] || content.none,
          ])}
        />
      </SectionCard>
    </Box>
  );
}

/**
 * Configurações (UC04, Figura 46), em seções empilhadas: dados da
 * organização da sessão e, para quem lê o plano, plano e uso com a
 * solicitação de mudança. O administrador da plataforma vê só a
 * organização dele.
 */
export default function SettingsPage() {
  const { can } = useSession();
  const organization = useResource(getOwnOrganization);
  const plan = useResource(can(P.PLAN_READ) ? getOwnPlan : noLoad);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState(null);

  function planChanged(text) {
    setNotice(text);
    plan.retry();
  }

  return (
    <>
      <PageHeader title={content.title} />
      <Stack spacing={2.5}>
        {notice ? (
          <Alert severity="success" onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}
        <ResourceState resource={organization}>
          {(data) => (
            <OrganizationSection
              organization={data}
              onEdit={
                can(P.ORGANIZATION_UPDATE) ? () => setEditing(true) : null
              }
            />
          )}
        </ResourceState>
        {can(P.PLAN_READ) ? (
          <ResourceState resource={plan}>
            {(data, meta) => (
              <PlanSection data={data} meta={meta} onChanged={planChanged} />
            )}
          </ResourceState>
        ) : null}
      </Stack>

      {editing ? (
        <OrganizationDialog
          organization={organization.data}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setNotice(organizationSectionContent.saved);
            organization.retry();
          }}
        />
      ) : null}
    </>
  );
}

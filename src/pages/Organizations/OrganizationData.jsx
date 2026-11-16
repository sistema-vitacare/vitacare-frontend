import { Box, Button, Stack } from '@mui/material';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import DefinitionList from '../../components/DefinitionList.jsx';
import OrganizationFormDialog from '../../components/OrganizationFormDialog.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { organizationFieldLabels as labels } from '../../data/organizationFields.js';
import { organizationDataContent as content } from '../../data/organizationPages.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  deactivateOrganization,
  reactivateOrganization,
  updateOrganization,
} from '../../services/platformOrganizationService.js';
import { formatDateTime } from '../../utils/format.js';
import OrganizationStatusChip from './OrganizationStatusChip.jsx';

const FIELDS = ['code', 'tradeName', 'legalName', 'document', 'phone', 'email'];

/**
 * Dados e situação de uma organização cliente (UC03): Editar no mesmo
 * diálogo das Configurações, também com a organização inativa, e Inativar
 * ou Reativar com confirmação. `onChanged` recebe o aviso do que mudou, para
 * a página recarregar.
 */
export default function OrganizationData({ organization, onChanged }) {
  const { can } = useSession();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const active = organization.status === 'active';
  // A organização da plataforma fica sempre ativa, como na API.
  const changesStatus =
    can(P.PLATFORM_ORGANIZATIONS_CHANGE_STATUS) &&
    organization.kind !== 'platform';
  const transition = active ? content.deactivate : content.reactivate;

  const save = useCallback(
    (body) => updateOrganization(organization.id, body),
    [organization.id],
  );
  const changeStatus = useCallback(
    () =>
      active
        ? deactivateOrganization(organization.id)
        : reactivateOrganization(organization.id),
    [active, organization.id],
  );
  const status = useSubmit(changeStatus);

  async function confirmStatus() {
    const outcome = await status.submit();
    if (outcome.data) {
      setConfirming(false);
      onChanged(transition.done);
    }
  }

  const actions = [
    can(P.PLATFORM_ORGANIZATIONS_UPDATE) ? (
      <Button key="edit" variant="outlined" onClick={() => setEditing(true)}>
        {content.edit}
      </Button>
    ) : null,
    changesStatus ? (
      <Button
        key="status"
        variant="outlined"
        color={active ? 'error' : 'primary'}
        onClick={() => setConfirming(true)}
      >
        {transition.action}
      </Button>
    ) : null,
  ].filter(Boolean);

  return (
    <Box component="section" aria-label={content.title}>
      <SectionCard
        title={content.title}
        action={
          actions.length > 0 ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: 'stretch' }}
            >
              {actions}
            </Stack>
          ) : null
        }
      >
        <DefinitionList
          rows={[
            ...FIELDS.map((field) => [
              labels[field],
              organization[field] || content.none,
            ]),
            [
              content.fields.status,
              <OrganizationStatusChip
                key="status"
                status={organization.status}
              />,
            ],
            [content.fields.createdAt, formatDateTime(organization.createdAt)],
          ]}
        />
      </SectionCard>

      {editing ? (
        <OrganizationFormDialog
          organization={organization}
          save={save}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged(content.saved);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={transition.title}
        text={transition.text(organization.tradeName)}
        confirmLabel={transition.action}
        tone={active ? 'error' : 'primary'}
        pending={status.status === 'submitting'}
        error={
          status.status === 'error'
            ? (status.error?.message ?? content.unexpected)
            : null
        }
        onConfirm={confirmStatus}
        onClose={() => setConfirming(false)}
      />
    </Box>
  );
}

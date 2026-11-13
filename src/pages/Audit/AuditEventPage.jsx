import { Box, Button, Stack, Typography } from '@mui/material';
import { useCallback } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import DefinitionList from '../../components/DefinitionList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PATHS } from '../../constants/routes.js';
import {
  auditEventContent as content,
  auditListContent,
  auditValueLabels,
} from '../../data/auditPages.js';
import { navLabels } from '../../data/navigation.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { getAuditEvent } from '../../services/auditService.js';
import { auditEntityPath } from '../../utils/auditEntity.js';
import { formatDateTime } from '../../utils/format.js';
import AuditEntity, { ActorName, ActorProfile } from './AuditEntity.jsx';
import AuditSeverityChip from './AuditSeverityChip.jsx';

const { none } = auditListContent;

// O valor sai como a API gravou; só lista, sim ou não e vazio ganham texto.
function valueText(value) {
  if (value === null || value === undefined || value === '') {
    return none;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : none;
  }
  if (typeof value === 'boolean') {
    return value ? content.yes : content.no;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function Section({ title, children }) {
  return (
    <Box component="section" aria-label={title}>
      <SectionCard title={title}>{children}</SectionCard>
    </Box>
  );
}

function RecordedValues({ title, values }) {
  return (
    <Section title={title}>
      <DefinitionList
        rows={Object.entries(values).map(([key, value]) => [
          auditValueLabels[key] ?? key,
          valueText(value),
        ])}
      />
    </Section>
  );
}

function EventData({ event }) {
  const { session, can } = useSession();
  const { fields } = content;
  const to = auditEntityPath(event, {
    organizationId: session.organization.id,
    can,
  });
  return (
    <Section title={content.eventTitle}>
      <DefinitionList
        rows={[
          [fields.occurredAt, formatDateTime(event.occurredAt)],
          [fields.organization, event.organization.name],
          [fields.actor, <ActorName key="actor" event={event} />],
          [fields.profile, <ActorProfile key="profile" event={event} />],
          [
            fields.action,
            <>
              {event.actionLabel}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {event.action}
              </Typography>
            </>,
          ],
          [fields.severity, <AuditSeverityChip severity={event.severity} />],
          [fields.entity, <AuditEntity entity={event.entity} to={to} />],
          [fields.ip, event.ipAddress ?? none],
          [fields.requestId, event.requestId ?? none],
        ]}
      />
    </Section>
  );
}

function AuditEvent({ event }) {
  const { beforeValues, afterValues } = event;
  const hasValues = Boolean(beforeValues || afterValues);
  return (
    <>
      <PageHeader
        title={event.actionLabel}
        subtitle={formatDateTime(event.occurredAt)}
        breadcrumbs={[{ label: navLabels.audit, to: PATHS.AUDIT }]}
      />
      <Stack spacing={2.5}>
        <EventData event={event} />
        {beforeValues ? (
          <RecordedValues title={content.beforeTitle} values={beforeValues} />
        ) : null}
        {afterValues ? (
          <RecordedValues title={content.afterTitle} values={afterValues} />
        ) : null}
        {hasValues ? null : (
          <Typography color="text.secondary">{content.noValues}</Typography>
        )}
      </Stack>
    </>
  );
}

/**
 * Detalhe de um evento da auditoria (UC06, passo 5): os campos da lista, os
 * valores como a API gravou e o link para a tela do item, quando a sessão
 * alcança. Evento de outra organização, para o administrador, é 404.
 */
export default function AuditEventPage() {
  const { eventId } = useParams();
  const load = useCallback(() => getAuditEvent(eventId), [eventId]);
  const resource = useResource(load);

  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Typography color="text.secondary">{content.notFoundText}</Typography>
        <Box>
          <Button component={RouterLink} to={PATHS.AUDIT} variant="contained">
            {content.backToAudit}
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <ResourceState resource={resource}>
      {(event) => <AuditEvent event={event} />}
    </ResourceState>
  );
}

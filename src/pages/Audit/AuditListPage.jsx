import {
  Alert,
  Box,
  Button,
  Card,
  Link,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FileCsv, MagnifyingGlass } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import PeriodFields from '../../components/PeriodFields.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { AUDIT_ACTOR_TYPES, AUDIT_SEVERITIES } from '../../constants/audit.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { auditEventPath } from '../../constants/routes.js';
import {
  auditActorTypeLabels,
  auditListContent as content,
  auditSeverityLabels,
} from '../../data/auditPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  exportAuditEvents,
  listAuditActions,
  listAuditEvents,
} from '../../services/auditService.js';
import { listOrganizations } from '../../services/platformOrganizationService.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import { formatDateTime, todayInSaoPaulo } from '../../utils/format.js';
import { resolvePeriod } from '../../utils/period.js';
import { saveFile } from '../../utils/saveFile.js';
import AuditEntity, { ActorName, ActorProfile } from './AuditEntity.jsx';
import AuditSeverityChip from './AuditSeverityChip.jsx';

const PAGE_SIZE = 20;
// A API aceita até 100 por página; as organizações clientes cabem numa.
const ORGANIZATIONS_LIMIT = 100;

// Filtros no endereço, com nomes em português, como nas outras listas.
const PARAMS = {
  search: 'busca',
  from: 'de',
  to: 'ate',
  action: 'acao',
  severity: 'gravidade',
  actorType: 'origem',
  organizationId: 'organizacao',
  page: 'pagina',
};

function useFilters() {
  const [params, setParams] = useSearchParams();
  const severity = params.get(PARAMS.severity);
  const actorType = params.get(PARAMS.actorType);
  const filters = {
    search: params.get(PARAMS.search) ?? '',
    from: params.get(PARAMS.from) ?? '',
    to: params.get(PARAMS.to) ?? '',
    action: params.get(PARAMS.action) ?? '',
    severity: AUDIT_SEVERITIES.includes(severity) ? severity : '',
    actorType: AUDIT_ACTOR_TYPES.includes(actorType) ? actorType : '',
    organizationId: params.get(PARAMS.organizationId) ?? '',
    page: Math.max(1, Number(params.get(PARAMS.page)) || 1),
  };

  // Mudar um filtro volta à primeira página; valor vazio sai do endereço.
  function update(changes) {
    const next = { ...filters, page: 1, ...changes };
    const entries = Object.entries(PARAMS)
      .map(([name, param]) => [
        param,
        name === 'page'
          ? next.page === 1
            ? ''
            : String(next.page)
          : next[name],
      ])
      .filter(([, value]) => value !== '');
    setParams(new URLSearchParams(entries), { replace: true });
  }

  return [filters, update];
}

const loadOrganizations = () =>
  listOrganizations({ limit: ORGANIZATIONS_LIMIT });
const noLoad = () => Promise.resolve({ data: null, meta: {} });

function SelectFilter({ label, value, allLabel, options, onChange }) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      size="small"
      slotProps={{
        select: { displayEmpty: true },
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map(([optionValue, optionLabel]) => (
        <MenuItem key={optionValue} value={optionValue}>
          {optionLabel}
        </MenuItem>
      ))}
    </TextField>
  );
}

function Filters({ filters, update, errors, platform }) {
  const actions = useResource(listAuditActions);
  const organizations = useResource(platform ? loadOrganizations : noLoad);
  return (
    <Box
      component="section"
      aria-label={content.filtersLabel}
      sx={{
        mb: 2.5,
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
      }}
    >
      <TextField
        label={content.searchLabel}
        placeholder={content.searchPlaceholder}
        value={filters.search}
        onChange={(event) => update({ search: event.target.value })}
        size="small"
        sx={{ gridColumn: { sm: 'span 2' } }}
        slotProps={{
          input: {
            startAdornment: (
              <Box
                component="span"
                sx={{ display: 'flex', mr: 1, color: 'text.secondary' }}
              >
                <MagnifyingGlass size={18} aria-hidden="true" />
              </Box>
            ),
          },
        }}
      />
      <PeriodFields
        from={filters.from}
        to={filters.to}
        errors={errors}
        onChange={update}
      />
      <SelectFilter
        label={content.actionLabel}
        value={actions.data ? filters.action : ''}
        allLabel={content.allActions}
        options={(actions.data ?? []).map((item) => [item.action, item.label])}
        onChange={(action) => update({ action })}
      />
      <SelectFilter
        label={content.severityLabel}
        value={filters.severity}
        allLabel={content.allSeverities}
        options={AUDIT_SEVERITIES.map((code) => [
          code,
          auditSeverityLabels[code],
        ])}
        onChange={(severity) => update({ severity })}
      />
      <SelectFilter
        label={content.actorTypeLabel}
        value={filters.actorType}
        allLabel={content.allActorTypes}
        options={AUDIT_ACTOR_TYPES.map((code) => [
          code,
          auditActorTypeLabels[code],
        ])}
        onChange={(actorType) => update({ actorType })}
      />
      {platform ? (
        <SelectFilter
          label={content.organizationLabel}
          value={organizations.data ? filters.organizationId : ''}
          allLabel={content.allOrganizations}
          options={(organizations.data ?? []).map((item) => [
            item.id,
            item.tradeName,
          ])}
          onChange={(organizationId) => update({ organizationId })}
        />
      ) : null}
    </Box>
  );
}

function ActionLink({ event }) {
  return (
    <Link
      component={RouterLink}
      to={auditEventPath(event.id)}
      underline="hover"
      sx={{ fontWeight: 650, color: 'text.primary' }}
    >
      {event.actionLabel}
    </Link>
  );
}

function EventTable({ events, platform }) {
  const { columns } = content;
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{columns.occurredAt}</TableCell>
          {platform ? <TableCell>{columns.organization}</TableCell> : null}
          <TableCell>{columns.actor}</TableCell>
          <TableCell>{columns.profile}</TableCell>
          <TableCell>{columns.action}</TableCell>
          <TableCell>{columns.entity}</TableCell>
          <TableCell>{columns.ip}</TableCell>
          <TableCell>{columns.severity}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id} hover>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              {formatDateTime(event.occurredAt)}
            </TableCell>
            {platform ? <TableCell>{event.organization.name}</TableCell> : null}
            <TableCell>
              <ActorName event={event} />
            </TableCell>
            <TableCell>
              <ActorProfile event={event} />
            </TableCell>
            <TableCell>
              <ActionLink event={event} />
            </TableCell>
            <TableCell>
              <AuditEntity entity={event.entity} />
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              {event.ipAddress ?? content.none}
            </TableCell>
            <TableCell>
              <AuditSeverityChip severity={event.severity} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EventCards({ events, platform }) {
  return (
    <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {events.map((event) => (
        <Box
          component="li"
          key={event.id}
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          <Stack
            direction="row"
            sx={{
              gap: 1,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <ActionLink event={event} />
            <AuditSeverityChip severity={event.severity} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatDateTime(event.occurredAt)}
            {platform ? ` · ${event.organization.name}` : ''}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <ActorName event={event} /> · <ActorProfile event={event} />
          </Typography>
          <Box sx={{ mt: 1 }}>
            <AuditEntity entity={event.entity} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {content.columns.ip}: {event.ipAddress ?? content.none}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** "Exportar CSV" com os filtros da lista; o erro mostra a mensagem da API. */
function ExportCsvButton({ query }) {
  const action = useCallback(() => exportAuditEvents(query), [query]);
  const { status, error, submit } = useSubmit(action);

  async function exportCsv() {
    const { data } = await submit();
    if (data) {
      saveFile(data.blob, data.fileName);
    }
  }

  return (
    <Stack spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
      <Button
        variant="contained"
        onClick={exportCsv}
        loading={status === 'submitting'}
        startIcon={<FileCsv size={18} aria-hidden="true" />}
      >
        {content.exportCsv}
      </Button>
      {status === 'error' ? (
        <Alert severity="error">{error?.message ?? content.exportError}</Alert>
      ) : null}
    </Stack>
  );
}

/**
 * Trilha de auditoria (UC06, Figura 45): busca por quem fez ou pela ação,
 * período, ação do catálogo, gravidade, origem e, para o administrador da
 * plataforma, organização. Cada evento abre o detalhe; o CSV leva os mesmos
 * filtros da lista.
 */
export default function AuditListPage() {
  const { can, session } = useSession();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const platform = session.organization.kind === 'platform';
  const [filters, update] = useFilters();
  const { search, from, to, action, severity, actorType, organizationId } =
    filters;
  const { page } = filters;

  const errors = useMemo(
    () =>
      fieldErrorsFrom(resolvePeriod({ from, to }, todayInSaoPaulo()).errors),
    [from, to],
  );
  const valid = Object.keys(errors).length === 0;
  // Só o que foi preenchido; sem período, a API usa os últimos 30 dias.
  const query = useMemo(() => {
    const values = {
      search: search.trim(),
      from,
      to,
      action,
      severity,
      actorType,
      organizationId: platform ? organizationId : '',
    };
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== ''),
    );
  }, [search, from, to, action, severity, actorType, organizationId, platform]);

  const load = useCallback(
    () =>
      valid
        ? listAuditEvents({ ...query, page, limit: PAGE_SIZE })
        : Promise.resolve({ data: null, meta: {} }),
    [query, page, valid],
  );
  const resource = useResource(load);
  const pagination = resource.meta?.pagination;

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={pagination ? content.subtitle(pagination.total) : null}
        actions={
          valid && can(P.AUDIT_EVENTS_EXPORT) ? (
            <ExportCsvButton query={query} />
          ) : null
        }
      />

      <Filters
        filters={filters}
        update={update}
        errors={errors}
        platform={platform}
      />

      {valid ? (
        <Card>
          <ResourceState resource={resource} emptyText={resource.meta?.message}>
            {(events) =>
              isDesktop ? (
                <EventTable events={events} platform={platform} />
              ) : (
                <EventCards events={events} platform={platform} />
              )
            }
          </ResourceState>
        </Card>
      ) : null}

      {valid && pagination && pagination.total > 0 ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            {content.range(
              (pagination.page - 1) * pagination.limit + 1,
              Math.min(pagination.page * pagination.limit, pagination.total),
              pagination.total,
            )}
          </Typography>
          {pagination.totalPages > 1 ? (
            <Pagination
              aria-label={content.paginationLabel}
              count={pagination.totalPages}
              page={pagination.page}
              color="primary"
              onChange={(_, value) => update({ page: value })}
              getItemAriaLabel={(type, value) =>
                type === 'page'
                  ? `Ir para a página ${value}`
                  : `Ir para a página ${type === 'next' ? 'seguinte' : 'anterior'}`
              }
            />
          ) : null}
        </Stack>
      ) : null}
    </>
  );
}

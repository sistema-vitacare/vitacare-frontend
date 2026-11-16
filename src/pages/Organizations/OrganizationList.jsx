import {
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
import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, organizationPath } from '../../constants/routes.js';
import { organizationListContent as content } from '../../data/organizationPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listPlans } from '../../services/organizationService.js';
import { listOrganizations } from '../../services/platformOrganizationService.js';
import { formatDateTime } from '../../utils/format.js';
import OrganizationStatusChip from './OrganizationStatusChip.jsx';

const PAGE_SIZE = 20;
const STATUSES = ['active', 'inactive'];

// Filtros no endereço, com nomes em português, como nas outras listas.
const PARAMS = {
  search: 'busca',
  status: 'situacao',
  page: 'pagina',
};

function useFilters() {
  const [params, setParams] = useSearchParams();
  const status = params.get(PARAMS.status);
  const filters = {
    search: params.get(PARAMS.search) ?? '',
    status: STATUSES.includes(status) ? status : '',
    page: Math.max(1, Number(params.get(PARAMS.page)) || 1),
  };

  // Mudar um filtro volta à primeira página; valor vazio sai do endereço.
  function update(changes) {
    const next = { ...filters, page: 1, ...changes };
    const entries = [
      [PARAMS.search, next.search],
      [PARAMS.status, next.status],
      [PARAMS.page, next.page === 1 ? '' : String(next.page)],
    ].filter(([, value]) => value !== '');
    setParams(new URLSearchParams(entries), { replace: true });
  }

  return [filters, update];
}

function OrganizationName({ organization }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Link
        component={RouterLink}
        to={organizationPath(organization.id)}
        underline="hover"
        sx={{
          fontWeight: 650,
          color: 'text.primary',
          overflowWrap: 'anywhere',
        }}
      >
        {organization.tradeName}
      </Link>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', overflowWrap: 'anywhere' }}
      >
        {content.code(organization.code)}
      </Typography>
    </Box>
  );
}

function OrganizationTable({ organizations, planName }) {
  const { columns } = content;
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{columns.name}</TableCell>
          <TableCell>{columns.plan}</TableCell>
          <TableCell>{columns.status}</TableCell>
          <TableCell>{columns.createdAt}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {organizations.map((organization) => (
          <TableRow key={organization.id} hover>
            <TableCell>
              <OrganizationName organization={organization} />
            </TableCell>
            <TableCell>{planName(organization.usagePlanId)}</TableCell>
            <TableCell>
              <OrganizationStatusChip status={organization.status} />
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              {formatDateTime(organization.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OrganizationCards({ organizations, planName }) {
  return (
    <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {organizations.map((organization) => (
        <Box
          component="li"
          key={organization.id}
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          <OrganizationName organization={organization} />
          <Stack
            direction="row"
            // Com quebra de linha, o espaço vem do gap: a margem do
            // `spacing` empurraria o item que desce para a direita.
            sx={{ mt: 1.5, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <OrganizationStatusChip status={organization.status} />
            <Typography variant="body2" color="text.secondary">
              {planName(organization.usagePlanId)} · {content.columns.createdAt}
              : {formatDateTime(organization.createdAt)}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Organizações clientes (UC03), para o administrador da plataforma: busca,
 * situação e página no endereço, tabela no computador e cartões no celular,
 * com o plano pelo nome do catálogo, porque a lista da API só traz o id.
 * `children` entra entre o cabeçalho e os filtros, onde a página monta a
 * fila de solicitações.
 */
export default function OrganizationList({ children }) {
  const { can } = useSession();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [filters, update] = useFilters();
  const { search, status, page } = filters;
  const plans = useResource(listPlans);

  const load = useCallback(
    () =>
      listOrganizations({
        search: search.trim() || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [search, status, page],
  );
  const resource = useResource(load);
  const pagination = resource.meta?.pagination;
  const filtered = search.trim() !== '' || status !== '';
  const planName = (planId) =>
    plans.data?.find((plan) => plan.id === planId)?.name ?? '–';

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={pagination ? content.subtitle(pagination.total) : null}
        actions={
          can(P.PLATFORM_ORGANIZATIONS_CREATE) ? (
            <Button
              component={RouterLink}
              to={PATHS.ORGANIZATION_NEW}
              variant="contained"
              startIcon={<Plus size={18} aria-hidden="true" />}
            >
              {content.newOrganization}
            </Button>
          ) : null
        }
      />

      {children}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <TextField
          label={content.searchLabel}
          placeholder={content.searchPlaceholder}
          value={search}
          onChange={(event) => update({ search: event.target.value })}
          size="small"
          sx={{ flex: 2 }}
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
        <TextField
          select
          label={content.statusLabel}
          value={status}
          onChange={(event) => update({ status: event.target.value })}
          size="small"
          sx={{ flex: 1, minWidth: 180 }}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
        >
          <MenuItem value="">{content.allStatuses}</MenuItem>
          {STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {content.statusOptions[value]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card>
        <ResourceState
          resource={resource}
          emptyText={filtered ? content.noResults : content.empty}
        >
          {(organizations) =>
            isDesktop ? (
              <OrganizationTable
                organizations={organizations}
                planName={planName}
              />
            ) : (
              <OrganizationCards
                organizations={organizations}
                planName={planName}
              />
            )
          }
        </ResourceState>
      </Card>

      {pagination && pagination.total > 0 ? (
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

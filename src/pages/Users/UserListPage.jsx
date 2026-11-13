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
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { userPath } from '../../constants/routes.js';
import { TENANT_PROFILES, USER_STATUSES } from '../../constants/users.js';
import { profileLabels } from '../../data/profiles.js';
import { userListContent as content } from '../../data/userPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { getOwnPlan } from '../../services/organizationService.js';
import { listUsers } from '../../services/userService.js';
import { formatDateTime } from '../../utils/format.js';
import { userSituation } from '../../utils/userActions.js';
import InvitationResultDialog from './InvitationResultDialog.jsx';
import UserFormDialog from './UserFormDialog.jsx';
import UserStatusChip from './UserStatusChip.jsx';

const PAGE_SIZE = 20;

// Filtros no endereço, com nomes em português, como nas outras listas.
const PARAMS = {
  search: 'busca',
  profile: 'perfil',
  status: 'situacao',
  page: 'pagina',
};

function useFilters() {
  const [params, setParams] = useSearchParams();
  const profile = params.get(PARAMS.profile);
  const status = params.get(PARAMS.status);
  const filters = {
    search: params.get(PARAMS.search) ?? '',
    profile: TENANT_PROFILES.includes(profile) ? profile : '',
    status: USER_STATUSES.includes(status) ? status : '',
    page: Math.max(1, Number(params.get(PARAMS.page)) || 1),
  };

  // Mudar um filtro volta à primeira página; valor vazio sai do endereço.
  function update(changes) {
    const next = { ...filters, page: 1, ...changes };
    const entries = [
      [PARAMS.search, next.search],
      [PARAMS.profile, next.profile],
      [PARAMS.status, next.status],
      [PARAMS.page, next.page === 1 ? '' : String(next.page)],
    ].filter(([, value]) => value !== '');
    setParams(new URLSearchParams(entries), { replace: true });
  }

  return [filters, update];
}

/** Uma consulta por perfil, lendo o `total`: a API não traz a contagem. */
async function loadActiveCounts() {
  const responses = await Promise.all(
    TENANT_PROFILES.map((profileCode) =>
      listUsers({ status: 'active', profileCode, limit: 1 }),
    ),
  );
  return {
    data: TENANT_PROFILES.map((code, index) => ({
      code,
      total: responses[index].meta.pagination.total,
    })),
    meta: {},
  };
}

function ActiveCounters() {
  const counts = useResource(loadActiveCounts);
  return (
    <Box
      component="section"
      aria-label={content.countersLabel}
      sx={{ mb: 2.5 }}
    >
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {TENANT_PROFILES.map((code) => {
          const total = counts.data?.find((item) => item.code === code)?.total;
          return (
            <Card component="li" key={code} sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {profileLabels[code]}
              </Typography>
              <Typography variant="h2" component="p">
                {total ?? '–'}
              </Typography>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

function Seats() {
  const plan = useResource(getOwnPlan);
  if (!plan.data) {
    return null;
  }
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      {content.seats(plan.data.usage.users, plan.data.limits.users)}
    </Typography>
  );
}

function UserName({ user }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Link
        component={RouterLink}
        to={userPath(user.id)}
        underline="hover"
        sx={{
          fontWeight: 650,
          color: 'text.primary',
          overflowWrap: 'anywhere',
        }}
      >
        {user.name}
      </Link>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', overflowWrap: 'anywhere' }}
      >
        {user.email}
      </Typography>
    </Box>
  );
}

function Situation({ user }) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <UserStatusChip user={user} />
      {userSituation(user) === 'invited' ? (
        <Typography variant="caption" color="text.secondary">
          {content.invitationUntil(formatDateTime(user.invitation.expiresAt))}
        </Typography>
      ) : null}
    </Stack>
  );
}

const lastAccess = (user) =>
  user.lastAccessAt ? formatDateTime(user.lastAccessAt) : content.neverAccessed;

function UserTable({ users }) {
  const { columns } = content;
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{columns.name}</TableCell>
          <TableCell>{columns.profile}</TableCell>
          <TableCell>{columns.status}</TableCell>
          <TableCell>{columns.lastAccess}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} hover>
            <TableCell>
              <UserName user={user} />
            </TableCell>
            <TableCell>{profileLabels[user.profile.code]}</TableCell>
            <TableCell>
              <Situation user={user} />
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              {lastAccess(user)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UserCards({ users }) {
  return (
    <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {users.map((user) => (
        <Box
          component="li"
          key={user.id}
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          {/* Nome e e-mail com a largura toda, para o e-mail não quebrar. */}
          <UserName user={user} />
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            <Situation user={user} />
            <Typography variant="body2" color="text.secondary">
              {profileLabels[user.profile.code]} · {content.columns.lastAccess}:{' '}
              {lastAccess(user)}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Usuários da organização (UC03, Figura 44): busca, filtros de perfil e
 * situação, contadores dos ativos por perfil, vagas do plano e cadastro por
 * convite. Depois do cadastro, o resultado do convite aparece uma única vez,
 * e ao fechá-lo a tela abre o usuário.
 */
export default function UserListPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [filters, update] = useFilters();
  const { search, profile, status, page } = filters;
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const load = useCallback(
    () =>
      listUsers({
        search: search.trim() || undefined,
        profileCode: profile || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [search, profile, status, page],
  );
  const resource = useResource(load);
  const pagination = resource.meta?.pagination;
  const filtered = search.trim() !== '' || profile !== '' || status !== '';

  function closeCreated() {
    const { id } = created.data.user;
    setCreated(null);
    navigate(userPath(id));
  }

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={pagination ? content.subtitle(pagination.total) : null}
        actions={
          can(P.USERS_CREATE) ? (
            <Button
              variant="contained"
              startIcon={<Plus size={18} aria-hidden="true" />}
              onClick={() => setCreating(true)}
            >
              {content.newUser}
            </Button>
          ) : null
        }
      />

      <ActiveCounters />
      {can(P.PLAN_READ) ? <Seats /> : null}

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
          label={content.profileLabel}
          value={profile}
          onChange={(event) => update({ profile: event.target.value })}
          size="small"
          sx={{ flex: 1, minWidth: 180 }}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
        >
          <MenuItem value="">{content.allProfiles}</MenuItem>
          {TENANT_PROFILES.map((code) => (
            <MenuItem key={code} value={code}>
              {profileLabels[code]}
            </MenuItem>
          ))}
        </TextField>
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
          {Object.entries(content.statusOptions).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card>
        <ResourceState
          resource={resource}
          emptyText={filtered ? content.noResults : content.empty}
        >
          {(users) =>
            isDesktop ? (
              <UserTable users={users} />
            ) : (
              <UserCards users={users} />
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

      {creating ? (
        <UserFormDialog
          onClose={() => setCreating(false)}
          onSaved={(outcome) => {
            setCreating(false);
            setCreated(outcome);
          }}
        />
      ) : null}
      {created ? (
        <InvitationResultDialog
          outcome={created}
          userName={created.data.user.name}
          onClose={closeCreated}
        />
      ) : null}
    </>
  );
}

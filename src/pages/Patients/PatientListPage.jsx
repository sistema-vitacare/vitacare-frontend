import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
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
import { Navigate, Link as RouterLink, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import PatientStatusChip from '../../components/PatientStatusChip.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, patientPath } from '../../constants/routes.js';
import { patientListContent as content } from '../../data/patientList.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listPatients } from '../../services/patientService.js';
import { ageFromBirthDate } from '../../utils/format.js';
import { initials } from '../../utils/initials.js';

const PAGE_SIZE = 20;

// Filtros no endereço, com nomes em português: o "voltar" do navegador e a
// busca da barra superior abrem a lista no mesmo estado.
const PARAMS = {
  search: 'busca',
  condition: 'condicao',
  status: 'situacao',
  page: 'pagina',
};

function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = {
    search: params.get(PARAMS.search) ?? '',
    condition: params.get(PARAMS.condition) ?? '',
    status: params.get(PARAMS.status) === 'inactive' ? 'inactive' : 'active',
    page: Math.max(1, Number(params.get(PARAMS.page)) || 1),
  };

  // Mudar um filtro volta à primeira página; valor padrão sai do endereço.
  function update(changes) {
    const next = { ...filters, page: 1, ...changes };
    const entries = [
      [PARAMS.search, next.search],
      [PARAMS.condition, next.condition],
      [PARAMS.status, next.status === 'active' ? '' : next.status],
      [PARAMS.page, next.page === 1 ? '' : String(next.page)],
    ].filter(([, value]) => value !== '');
    setParams(new URLSearchParams(entries), { replace: true });
  }

  return [filters, update];
}

function PatientName({ patient }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', minWidth: 0 }}
    >
      <Avatar
        aria-hidden="true"
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.8125rem',
          fontWeight: 700,
          bgcolor: 'primary.light',
          color: 'primary.dark',
        }}
      >
        {initials(patient.name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={patientPath(patient.id)}
          underline="hover"
          sx={{
            fontWeight: 650,
            color: 'text.primary',
            overflowWrap: 'anywhere',
          }}
        >
          {patient.name}
        </Link>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block' }}
        >
          {content.age(ageFromBirthDate(patient.birthDate))}
        </Typography>
      </Box>
    </Stack>
  );
}

function Conditions({ patient }) {
  if (!patient.mainCondition) {
    return (
      <Typography variant="body2" color="text.secondary">
        {content.noCondition}
      </Typography>
    );
  }
  const extra = patient.secondaryConditions.length;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      <Chip size="small" label={patient.mainCondition} />
      {extra > 0 ? (
        <Chip
          size="small"
          variant="outlined"
          label={content.moreConditions(extra)}
        />
      ) : null}
    </Stack>
  );
}

function PatientTable({ patients }) {
  const { columns } = content;
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{columns.name}</TableCell>
          <TableCell>{columns.cpf}</TableCell>
          <TableCell>{columns.condition}</TableCell>
          <TableCell>{columns.responsible}</TableCell>
          <TableCell>{columns.status}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {patients.map((patient) => (
          <TableRow key={patient.id} hover>
            <TableCell>
              <PatientName patient={patient} />
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              {patient.cpf ?? content.noCpf}
            </TableCell>
            <TableCell>
              <Conditions patient={patient} />
            </TableCell>
            <TableCell>{patient.responsible?.name}</TableCell>
            <TableCell>
              <PatientStatusChip status={patient.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PatientCards({ patients }) {
  return (
    <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {patients.map((patient) => (
        <Box
          component="li"
          key={patient.id}
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <PatientName patient={patient} />
            <PatientStatusChip status={patient.status} />
          </Stack>
          <Stack spacing={1} sx={{ mt: 1.5, pl: 6 }}>
            <Conditions patient={patient} />
            <Typography variant="body2" color="text.secondary">
              {content.columns.responsible}: {patient.responsible?.name}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

/** Listagem de pacientes (UC07, Figura 34), com busca, filtros e paginação. */
export default function PatientListPage() {
  const { can } = useSession();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [filters, update] = useFilters();
  const { search, condition, status, page } = filters;

  const load = useCallback(
    () =>
      listPatients({
        search: search.trim() || undefined,
        condition: condition.trim() || undefined,
        status,
        page,
        limit: PAGE_SIZE,
      }),
    [search, condition, status, page],
  );
  const resource = useResource(load);
  const pagination = resource.meta?.pagination;
  const filtered = search.trim() !== '' || condition.trim() !== '';

  // O familiar com um único paciente vinculado vai direto ao acompanhamento.
  // A decisão vem do vínculo devolvido pela API, e não do nome do perfil.
  const only = resource.status === 'success' && resource.data;
  if (
    only &&
    !filtered &&
    status === 'active' &&
    pagination.total === 1 &&
    only[0].viewerLink?.role === 'family'
  ) {
    return <Navigate to={patientPath(only[0].id, 'history')} replace />;
  }

  let emptyText = status === 'inactive' ? content.emptyInactive : content.empty;
  if (filtered) {
    emptyText = content.noResults;
  }

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={
          pagination ? content.subtitle(pagination.total, status) : null
        }
        actions={
          can(P.PATIENTS_CREATE) ? (
            <Button
              component={RouterLink}
              to={PATHS.PATIENT_NEW}
              variant="contained"
              startIcon={<Plus size={18} aria-hidden="true" />}
            >
              {content.newPatient}
            </Button>
          ) : null
        }
      />

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
          label={content.conditionLabel}
          placeholder={content.conditionPlaceholder}
          value={condition}
          onChange={(event) => update({ condition: event.target.value })}
          size="small"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label={content.statusLabel}
          value={status}
          onChange={(event) => update({ status: event.target.value })}
          size="small"
          sx={{ flex: 1, minWidth: 140 }}
        >
          {Object.entries(content.statusOptions).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card>
        <ResourceState resource={resource} emptyText={emptyText}>
          {(patients) =>
            isDesktop ? (
              <PatientTable patients={patients} />
            ) : (
              <PatientCards patients={patients} />
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

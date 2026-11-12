import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  InputAdornment,
  Link,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useCallback, useId } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import FormStatusChip from '../../components/FormStatusChip.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { FORM_STATUSES } from '../../constants/formFields.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, formPath } from '../../constants/routes.js';
import {
  formStatusLabels,
  frequencyText,
  audienceLabels,
} from '../../data/formLabels.js';
import { formListContent as content } from '../../data/formList.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listForms } from '../../services/formService.js';

const PAGE_SIZE = 20;

// Filtros no endereço, como na lista de pacientes: o "voltar" do navegador
// devolve a lista no mesmo estado.
const PARAMS = { search: 'busca', status: 'situacao', page: 'pagina' };

function useFilters() {
  const [params, setParams] = useSearchParams();
  const status = params.get(PARAMS.status) ?? '';
  const filters = {
    search: params.get(PARAMS.search) ?? '',
    status: FORM_STATUSES.includes(status) ? status : '',
    page: Math.max(1, Number(params.get(PARAMS.page)) || 1),
  };

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

function FormItem({ form }) {
  const version = form.currentVersion;
  const details = [
    version ? content.version(version.number) : content.neverPublished,
    version ? content.fieldCount(version.fieldCount) : null,
    frequencyText(form.frequency),
    form.audience === 'patients'
      ? content.patients(form.patientIds.length)
      : audienceLabels.organization,
  ].filter(Boolean);
  return (
    <Box
      component="li"
      sx={{
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
      >
        <Link
          component={RouterLink}
          to={formPath(form.id)}
          sx={{ fontWeight: 700 }}
        >
          {form.name}
        </Link>
        <FormStatusChip status={form.status} />
        {form.hasDraft && form.currentVersion ? (
          <Chip size="small" variant="outlined" label={content.pendingDraft} />
        ) : null}
      </Stack>
      {form.trackingType ? (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {form.trackingType}
        </Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
        {details.join(' · ')}
      </Typography>
    </Box>
  );
}

/** Lista de formulários de acompanhamento (UC09, Figura 39). */
export default function FormListPage() {
  const { can } = useSession();
  const titleId = useId();
  const [filters, update] = useFilters();
  const { search, status, page } = filters;
  const configures = can(P.FORMS_UPDATE);
  const load = useCallback(
    () =>
      listForms({
        search: search.trim() || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [search, status, page],
  );
  const forms = useResource(load);
  const pagination = forms.meta?.pagination;
  const filtered = search.trim() !== '' || status !== '';

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={content.subtitle}
        actions={
          can(P.FORMS_CREATE) ? (
            <Button
              component={RouterLink}
              to={PATHS.FORM_NEW}
              variant="contained"
              startIcon={<Plus aria-hidden="true" />}
            >
              {content.newForm}
            </Button>
          ) : null
        }
      />
      <Stack spacing={2.5}>
        {configures ? null : <Alert severity="info">{content.readOnly}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: configures ? '2fr 1fr' : '1fr',
            },
          }}
        >
          <TextField
            label={content.searchLabel}
            value={search}
            onChange={(event) => update({ search: event.target.value })}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass aria-hidden="true" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {configures ? (
            <TextField
              select
              label={content.statusLabel}
              value={status}
              onChange={(event) => update({ status: event.target.value })}
              size="small"
            >
              <MenuItem value="">{content.allStatuses}</MenuItem>
              {FORM_STATUSES.map((value) => (
                <MenuItem key={value} value={value}>
                  {formStatusLabels[value]}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Box>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Typography id={titleId} variant="h2">
            {content.listLabel}
          </Typography>
          {forms.status === 'success' ? (
            <Typography variant="body2" color="text.secondary">
              {content.count(pagination.total)}
            </Typography>
          ) : null}
          <Box sx={{ mt: 1 }}>
            <ResourceState
              resource={forms}
              emptyText={filtered ? content.noResults : content.empty}
            >
              {(items) => (
                <Box
                  component="ul"
                  aria-labelledby={titleId}
                  sx={{ m: 0, p: 0, listStyle: 'none' }}
                >
                  {items.map((form) => (
                    <FormItem key={form.id} form={form} />
                  ))}
                </Box>
              )}
            </ResourceState>
          </Box>
          {pagination && pagination.totalPages > 1 ? (
            <Pagination
              aria-label={content.paginationLabel}
              count={pagination.totalPages}
              page={pagination.page}
              color="primary"
              onChange={(_, value) => update({ page: value })}
              sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
            />
          ) : null}
        </Card>
      </Stack>
    </>
  );
}

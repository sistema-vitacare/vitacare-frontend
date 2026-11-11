import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useCallback, useId, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import PatientSummary from '../../components/PatientSummary.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, patientPath } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import { patientHistoryContent as content } from '../../data/patientHistory.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listFollowUps } from '../../services/followUpService.js';
import {
  getPatient,
  getPatientEvolution,
} from '../../services/patientService.js';
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../utils/format.js';

const PAGE_SIZE = 20;
// As opções dos filtros vêm dos registros do próprio paciente.
const OPTIONS_LIMIT = 100;

function answerText(answer) {
  if (answer.fieldType === 'boolean') {
    return answer.value ? content.records.yes : content.records.no;
  }
  if (Array.isArray(answer.value)) {
    return answer.value.join(', ');
  }
  if (typeof answer.value === 'number') {
    const value = formatNumber(answer.value);
    return answer.unit ? `${value} ${answer.unit}` : value;
  }
  return answer.value;
}

function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [item[key], item])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  );
}

function Filters({ filters, update, options }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr) auto' },
        alignItems: 'center',
      }}
    >
      <TextField
        type="date"
        label={content.filters.from}
        value={filters.from}
        onChange={(event) => update({ from: event.target.value })}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type="date"
        label={content.filters.to}
        value={filters.to}
        onChange={(event) => update({ to: event.target.value })}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        select
        label={content.filters.form}
        value={filters.formId}
        onChange={(event) => update({ formId: event.target.value })}
        size="small"
      >
        <MenuItem value="">{content.filters.all}</MenuItem>
        {options.forms.map((form) => (
          <MenuItem key={form.id} value={form.id}>
            {form.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={content.filters.author}
        value={filters.authorUserId}
        onChange={(event) => update({ authorUserId: event.target.value })}
        size="small"
      >
        <MenuItem value="">{content.filters.all}</MenuItem>
        {options.authors.map((author) => (
          <MenuItem key={author.id} value={author.id}>
            {author.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        onClick={() =>
          update({ from: '', to: '', formId: '', authorUserId: '' })
        }
      >
        {content.filters.clear}
      </Button>
    </Box>
  );
}

function RecordItem({ record }) {
  const annulled = record.status === 'annulled';
  return (
    <Box
      component="li"
      sx={{
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
        opacity: annulled ? 0.75 : 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatDateTime(record.visitedAt)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {record.form.name} · {content.records.by} {record.author.name}
        </Typography>
        {annulled ? (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={content.records.annulled}
          />
        ) : null}
      </Stack>
      <Box
        sx={{
          mt: 1,
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 2.5,
          rowGap: 0.5,
          textDecoration: annulled ? 'line-through' : 'none',
        }}
      >
        {record.answers.map((answer) => (
          <Typography variant="body2" key={answer.fieldId}>
            {answer.name}: {answerText(answer)}
          </Typography>
        ))}
      </Box>
      {record.notes ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {content.records.notes}: {record.notes}
        </Typography>
      ) : null}
      {annulled ? (
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
          {content.records.annulledBy(
            record.annulment.annulledBy.name,
            formatDateTime(record.annulment.annulledAt),
          )}{' '}
          {content.records.reason}: {record.annulment.reason}
        </Typography>
      ) : null}
    </Box>
  );
}

function Records({ patientId, filters, update }) {
  const titleId = useId();
  const { from, to, formId, authorUserId, page } = filters;
  const load = useCallback(
    () =>
      listFollowUps({
        patientId,
        from: from || undefined,
        to: to || undefined,
        formId: formId || undefined,
        authorUserId: authorUserId || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [patientId, from, to, formId, authorUserId, page],
  );
  const records = useResource(load);
  const pagination = records.meta?.pagination;
  const filtered = Boolean(from || to || formId || authorUserId);

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Typography id={titleId} variant="h2">
        {content.records.title}
      </Typography>
      {records.status === 'success' ? (
        <Typography variant="body2" color="text.secondary">
          {content.records.count(pagination.total)}
        </Typography>
      ) : null}
      <Box sx={{ mt: 1 }}>
        <ResourceState
          resource={records}
          emptyText={
            filtered ? content.records.noResults : content.records.empty
          }
        >
          {(items) => (
            <Box
              component="ul"
              aria-labelledby={titleId}
              sx={{ m: 0, p: 0, listStyle: 'none' }}
            >
              {items.map((record) => (
                <RecordItem key={record.id} record={record} />
              ))}
            </Box>
          )}
        </ResourceState>
      </Box>
      {pagination && pagination.totalPages > 1 ? (
        <Pagination
          aria-label={content.records.paginationLabel}
          count={pagination.totalPages}
          page={pagination.page}
          color="primary"
          onChange={(_, value) => update({ page: value }, { keepPage: true })}
          getItemAriaLabel={(type, value) =>
            type === 'page'
              ? `Ir para a página ${value}`
              : `Ir para a página ${type === 'next' ? 'seguinte' : 'anterior'}`
          }
          sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
        />
      ) : null}
    </Card>
  );
}

function trendText(trend) {
  if (!trend) {
    return content.evolution.notEnough;
  }
  const slope = formatNumber(Math.abs(trend.slopePerDay));
  return content.evolution.directions[trend.direction](slope);
}

function SeriesCard({ series }) {
  const { indicators, unit } = series;
  const suffix = unit ? ` ${unit}` : '';
  const items = [
    [content.evolution.mean, `${formatNumber(indicators.mean)}${suffix}`],
    [
      content.evolution.variation,
      indicators.variation === null
        ? content.evolution.notEnough
        : `${formatNumber(indicators.variation)}${suffix}`,
    ],
    [content.evolution.trend, trendText(indicators.trend)],
  ];
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h3">
        {series.name}
        {unit ? ` (${unit})` : ''}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {series.form.name}
      </Typography>
      <Box
        component="figure"
        aria-label={content.evolution.chartLabel(series.name)}
        sx={{ m: 0, mt: 1 }}
      >
        <LineChart
          height={180}
          margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
          xAxis={[
            {
              data: series.points.map((point) => new Date(point.visitedAt)),
              scaleType: 'time',
              valueFormatter: (date) =>
                formatDate(date.toISOString().slice(0, 10)),
            },
          ]}
          yAxis={[
            series.fieldType === 'scale'
              ? { min: series.scaleMin, max: series.scaleMax, width: 36 }
              : { width: 36 },
          ]}
          series={[
            {
              data: series.points.map((point) => point.value),
              color: 'var(--chart-line)',
              // Reta entre as medições: a curva suavizada sugeriria valores
              // que ninguém mediu entre uma visita e outra.
              curve: 'linear',
              showMark: true,
            },
          ]}
          sx={(theme) => ({ '--chart-line': theme.palette.primary.main })}
        />
      </Box>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {items.map(([label, value]) => (
          <Box key={label}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{ m: 0, fontWeight: 650 }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

function Evolution({ patientId, filters }) {
  const titleId = useId();
  const { from, to } = filters;
  const load = useCallback(
    () =>
      getPatientEvolution(patientId, {
        from: from || undefined,
        to: to || undefined,
      }),
    [patientId, from, to],
  );
  const evolution = useResource(load);
  const custom = Boolean(from || to);
  return (
    <Box component="section" aria-labelledby={titleId}>
      <Typography id={titleId} variant="h2">
        {content.evolution.title}
      </Typography>
      <Box sx={{ mb: 2 }}>
        {!custom ? (
          <Typography variant="body2" color="text.secondary">
            {content.evolution.defaultPeriod}
          </Typography>
        ) : null}
        {evolution.data ? (
          <Typography variant="body2" color="text.secondary">
            {content.evolution.period(
              formatDate(evolution.data.period.from),
              formatDate(evolution.data.period.to),
            )}
          </Typography>
        ) : null}
      </Box>
      <ResourceState resource={evolution}>
        {(data) =>
          data.series.length === 0 ? (
            <Typography color="text.secondary">
              {content.evolution.empty}
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                  xl: 'repeat(3, 1fr)',
                },
              }}
            >
              {data.series.map((series) => (
                <SeriesCard key={series.fieldKey} series={series} />
              ))}
            </Box>
          )
        }
      </ResourceState>
    </Box>
  );
}

const EMPTY_FILTERS = {
  from: '',
  to: '',
  formId: '',
  authorUserId: '',
  page: 1,
};

function History({ patient }) {
  const { can } = useSession();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const loadOptions = useCallback(
    () => listFollowUps({ patientId: patient.id, limit: OPTIONS_LIMIT }),
    [patient.id],
  );
  const optionsResource = useResource(loadOptions);
  const options = useMemo(() => {
    const items = optionsResource.data ?? [];
    return {
      forms: uniqueBy(
        items.map((item) => item.form),
        'id',
      ),
      authors: uniqueBy(
        items.map((item) => item.author),
        'id',
      ),
    };
  }, [optionsResource.data]);

  // Mudar um filtro volta à primeira página.
  function update(changes, { keepPage = false } = {}) {
    setFilters((current) => ({
      ...current,
      ...changes,
      page: keepPage ? changes.page : 1,
    }));
  }

  // O aviso de leitura vale para quem não tem nenhuma escrita sobre o
  // paciente, como o familiar.
  const readOnly = !can(P.PATIENTS_UPDATE) && !can(P.FOLLOW_UPS_CREATE);

  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={patient.name}
        breadcrumbs={[
          { label: navLabels.patients, to: PATHS.PATIENTS },
          { label: patient.name, to: patientPath(patient.id) },
        ]}
      />
      <Stack spacing={2.5}>
        {readOnly ? <Alert severity="info">{content.readOnly}</Alert> : null}
        <PatientSummary patient={patient} />
        <Filters filters={filters} update={update} options={options} />
        {can(P.PATIENT_EVOLUTION_READ) ? (
          <Evolution patientId={patient.id} filters={filters} />
        ) : null}
        <Records patientId={patient.id} filters={filters} update={update} />
      </Stack>
    </>
  );
}

/** Histórico e evolução do paciente (UC12, UC14, Figura 37). */
export default function PatientHistoryPage() {
  const { patientId } = useParams();
  const load = useCallback(() => getPatient(patientId), [patientId]);
  const resource = useResource(load);
  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Box>
          <Button
            component={RouterLink}
            to={PATHS.PATIENTS}
            variant="contained"
          >
            {content.backToList}
          </Button>
        </Box>
      </Stack>
    );
  }
  return (
    <ResourceState resource={resource}>
      {(patient) => <History patient={patient} />}
    </ResourceState>
  );
}

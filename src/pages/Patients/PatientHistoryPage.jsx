import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useCallback, useId } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import FollowUpFilters from '../../components/FollowUpFilters.jsx';
import FollowUpList from '../../components/FollowUpList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PatientSummary from '../../components/PatientSummary.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, patientPath } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import { patientHistoryContent as content } from '../../data/patientHistory.js';
import { useFollowUpFilters } from '../../hooks/useFollowUpFilters.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import {
  getPatient,
  getPatientEvolution,
} from '../../services/patientService.js';
import { formatDate, formatNumber } from '../../utils/format.js';

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

function History({ patient }) {
  const { can } = useSession();
  const { filters, update, options } = useFollowUpFilters(patient.id);

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
        <FollowUpFilters filters={filters} update={update} options={options} />
        {can(P.PATIENT_EVOLUTION_READ) ? (
          <Evolution patientId={patient.id} filters={filters} />
        ) : null}
        <FollowUpList
          patientId={patient.id}
          filters={filters}
          update={update}
        />
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

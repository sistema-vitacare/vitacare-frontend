import {
  Alert,
  Box,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useCallback } from 'react';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SeverityChip from '../../components/SeverityChip.jsx';
import { alertSourceLabels } from '../../data/alertPages.js';
import {
  alertsReportContent as content,
  managementReportContent,
} from '../../data/managementReports.js';
import { severityLabels } from '../../data/patientFields.js';
import { useReportFilters } from '../../hooks/useReportFilters.js';
import { useResource } from '../../hooks/useResource.js';
import {
  exportAlertsReportPdf,
  getAlertsReport,
} from '../../services/managementReportService.js';
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../utils/format.js';
import ExportPdfButton from './ExportPdfButton.jsx';
import ManagementFilters from './ManagementFilters.jsx';
import ReportHeader from './ReportHeader.jsx';

// Chaves de `bySource` da API e o código da origem, que dá o rótulo.
const SOURCES = [
  ['reading', 'reading'],
  ['absence', 'absence'],
  ['medicationReminder', 'medication_reminder'],
];
const SEVERITIES = ['critical', 'warning', 'info'];

function Totals({ totals }) {
  return (
    <Box
      component="section"
      aria-label={content.totalsLabel}
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
      }}
    >
      {Object.entries(content.totals).map(([key, label]) => (
        <Card key={key} sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h2" component="p">
            {totals[key]}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}

function Breakdown({ report }) {
  const { columns } = content;
  const rows = [
    ...SOURCES.map(([key, code]) => [
      alertSourceLabels[code],
      report.bySource[key],
    ]),
    ...SEVERITIES.map((severity) => [
      severityLabels[severity],
      report.bySeverity[severity],
    ]),
  ];
  return (
    <SectionCard title={content.breakdownTitle}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{columns.group}</TableCell>
            <TableCell align="right">{columns.total}</TableCell>
            <TableCell align="right">{columns.open}</TableCell>
            <TableCell align="right">{columns.resolved}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([label, counts]) => (
            <TableRow key={label}>
              <TableCell>{label}</TableCell>
              <TableCell align="right">{counts.total}</TableCell>
              <TableCell align="right">{counts.open}</TableCell>
              <TableCell align="right">{counts.resolved}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

const hours = (value) => (value === null ? '–' : formatNumber(value));

function Resolution({ resolution }) {
  const line = ({ resolved, averageHours, medianHours }) =>
    content.resolution(resolved, hours(averageHours), hours(medianHours));
  return (
    <SectionCard title={content.resolutionTitle}>
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {line(resolution.overall)}
        </Typography>
        {SEVERITIES.map((severity) => (
          <Typography variant="body2" key={severity}>
            {severityLabels[severity]}: {line(resolution.bySeverity[severity])}
          </Typography>
        ))}
      </Stack>
    </SectionCard>
  );
}

function ByDay({ byDay }) {
  return (
    <SectionCard title={content.byDayTitle}>
      <Box sx={(theme) => ({ '--chart-bar': theme.palette.primary.main })}>
        <BarChart
          height={220}
          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
          xAxis={[
            {
              data: byDay.map((day) => formatDate(day.date).slice(0, 5)),
              scaleType: 'band',
            },
          ]}
          yAxis={[{ width: 32, tickMinStep: 1 }]}
          series={[
            {
              data: byDay.map((day) => day.total),
              label: content.byDaySeries,
              color: 'var(--chart-bar)',
            },
          ]}
          hideLegend
        />
      </Box>
    </SectionCard>
  );
}

function TopPatients({ items }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <SectionCard title={content.topPatientsTitle}>
      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
        {items.map((item) => (
          <Typography
            component="li"
            variant="body2"
            key={item.patient.id}
            sx={{ py: 0.5 }}
          >
            <Box component="span" sx={{ fontWeight: 650 }}>
              {item.patient.name}
            </Box>
            {item.patient.status === 'inactive' ? ` (${content.inactive})` : ''}{' '}
            · {content.topPatient(item.total, item.intercurrences, item.open)}
          </Typography>
        ))}
      </Box>
    </SectionCard>
  );
}

function Intercurrences({ report }) {
  const { intercurrences } = report;
  return (
    <SectionCard title={content.intercurrencesTitle}>
      {report.intercurrencesTruncated ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {content.truncated(report.totals.intercurrences)}
        </Alert>
      ) : null}
      {intercurrences.length === 0 ? (
        <Typography color="text.secondary">
          {content.noIntercurrences}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {intercurrences.map((item) => (
            <Box
              component="li"
              key={item.id}
              sx={{
                py: 1.25,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Stack
                direction="row"
                sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
              >
                <SeverityChip severity="critical" />
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {item.patient.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {alertSourceLabels[item.source]}
                  {item.subject ? ` · ${item.subject}` : ''}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {formatDateTime(item.generatedAt)} ·{' '}
                {item.hoursToResolve === null
                  ? content.open
                  : content.resolvedIn(formatNumber(item.hoursToResolve))}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

/**
 * Relatório de alertas e intercorrências (Figura 43, BE-30): totais, origem
 * e severidade, tempo até a resolução, alertas por dia, os pacientes com
 * mais alertas e as intercorrências do período.
 */
export default function AlertsReport({ onExported }) {
  const filters = useReportFilters();
  const { valid, query } = filters;
  const load = useCallback(
    () =>
      valid
        ? getAlertsReport(query)
        : Promise.resolve({ data: null, meta: {} }),
    [query, valid],
  );
  const resource = useResource(load);
  const exportAction = useCallback(() => exportAlertsReportPdf(query), [query]);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { md: 'flex-start' },
        }}
      >
        <ManagementFilters filters={filters} />
        {resource.data ? (
          <ExportPdfButton
            action={exportAction}
            labels={managementReportContent}
            onExported={onExported}
          />
        ) : null}
      </Stack>
      {valid ? (
        <ResourceState resource={resource}>
          {(report) => (
            <Stack spacing={2.5}>
              <ReportHeader report={report} />
              {resource.meta?.message ? (
                <Alert severity="info">{resource.meta.message}</Alert>
              ) : null}
              <Totals totals={report.totals} />
              <Breakdown report={report} />
              <Resolution resolution={report.resolution} />
              <ByDay byDay={report.byDay} />
              <TopPatients items={report.topPatients} />
              <Intercurrences report={report} />
            </Stack>
          )}
        </ResourceState>
      ) : null}
    </Stack>
  );
}

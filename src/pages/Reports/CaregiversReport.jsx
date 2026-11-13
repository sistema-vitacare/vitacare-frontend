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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback } from 'react';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import {
  caregiversReportContent as content,
  managementReportContent,
} from '../../data/managementReports.js';
import { useReportFilters } from '../../hooks/useReportFilters.js';
import { useResource } from '../../hooks/useResource.js';
import {
  exportCaregiversReportPdf,
  getCaregiversReport,
} from '../../services/managementReportService.js';
import ExportPdfButton from './ExportPdfButton.jsx';
import ManagementFilters from './ManagementFilters.jsx';
import ReportHeader from './ReportHeader.jsx';

const COUNTS = Object.keys(content.columns).filter(
  (key) => key !== 'caregiver',
);

function Summary({ summary }) {
  return (
    <Box
      component="section"
      aria-label={content.summaryLabel}
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
      }}
    >
      {Object.entries(content.summary).map(([key, label]) => (
        <Card key={key} sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h2" component="p">
            {summary[key]}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}

const caregiverName = ({ caregiver }) =>
  caregiver.status === 'inactive'
    ? `${caregiver.name} (${content.inactive})`
    : caregiver.name;

function CaregiverTable({ rows }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {Object.entries(content.columns).map(([key, label]) => (
              <TableCell
                key={key}
                align={key === 'caregiver' ? 'left' : 'right'}
              >
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.caregiver.id}>
              <TableCell>{caregiverName(row)}</TableCell>
              {COUNTS.map((key) => (
                <TableCell key={key} align="right">
                  {row[key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function CaregiverCards({ rows }) {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {rows.map((row) => (
        <Box
          component="li"
          key={row.caregiver.id}
          sx={{
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {caregiverName(row)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {COUNTS.map((key) => `${content.columns[key]}: ${row[key]}`).join(
              ' · ',
            )}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Atividade dos cuidadores (Figura 43, BE-30): vínculos, registros e alertas
 * de cada cuidador no período, sem nota nem classificação de desempenho.
 */
export default function CaregiversReport({ onExported }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const filters = useReportFilters();
  const { valid, query } = filters;
  const load = useCallback(
    () =>
      valid
        ? getCaregiversReport(query)
        : Promise.resolve({ data: null, meta: {} }),
    [query, valid],
  );
  const resource = useResource(load);
  const exportAction = useCallback(
    () => exportCaregiversReportPdf(query),
    [query],
  );

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
              <Summary summary={report.summary} />
              <SectionCard
                title={content.summary.caregivers}
                subtitle={content.noRanking}
              >
                {isDesktop ? (
                  <CaregiverTable rows={report.caregivers} />
                ) : (
                  <CaregiverCards rows={report.caregivers} />
                )}
              </SectionCard>
            </Stack>
          )}
        </ResourceState>
      ) : null}
    </Stack>
  );
}

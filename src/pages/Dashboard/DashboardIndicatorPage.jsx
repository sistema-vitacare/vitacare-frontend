import {
  Box,
  Button,
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
import { Link as RouterLink, useParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { ALERT_SEVERITIES } from '../../constants/alerts.js';
import { DEFAULT_SHORTCUT } from '../../constants/dashboard.js';
import {
  PATHS,
  dashboardPath,
  indicatorFromSlug,
} from '../../constants/routes.js';
import { alertSourceLabels } from '../../data/alertPages.js';
import {
  dashboardContent,
  dashboardIndicatorContent as content,
} from '../../data/dashboardPages.js';
import { navLabels } from '../../data/navigation.js';
import { severityLabels } from '../../data/patientFields.js';
import { profileLabels } from '../../data/profiles.js';
import { useDashboardPeriod } from '../../hooks/useDashboardPeriod.js';
import { useResource } from '../../hooks/useResource.js';
import {
  getDashboardAlerts,
  getDashboardFollowUps,
  getDashboardPatients,
  getDashboardUsers,
} from '../../services/dashboardService.js';
import { formatDate } from '../../utils/format.js';
import PeriodShortcuts from './PeriodShortcuts.jsx';

function Summary({ items }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {items.map(([label, value]) => (
        <Card key={label} sx={{ p: 2 }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography component="dd" variant="h2" sx={{ m: 0 }}>
            {value}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}

/** Tabela de nome e números; `columns` são os títulos das colunas numéricas. */
function CountTable({ label, header, columns, rows }) {
  return (
    <SectionCard title={label}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label={label}>
          <TableHead>
            <TableRow>
              <TableCell>{header}</TableCell>
              {columns.map((column) => (
                <TableCell key={column} align="right">
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(([name, ...values]) => (
              <TableRow key={name}>
                <TableCell>{name}</TableCell>
                {values.map((value, index) => (
                  <TableCell key={columns[index]} align="right">
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </SectionCard>
  );
}

function DayChart({ label, byDay }) {
  return (
    <SectionCard title={label}>
      <Box component="figure" aria-label={label} sx={{ m: 0 }}>
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
              color: 'var(--chart-bar)',
            },
          ]}
          hideLegend
          sx={(theme) => ({ '--chart-bar': theme.palette.primary.main })}
        />
      </Box>
    </SectionCard>
  );
}

const severityRows = (counts) =>
  ALERT_SEVERITIES.map((severity) => [
    severityLabels[severity],
    counts[severity],
  ]);

// O que cada indicador carrega e mostra; usuários não dependem de período.
const INDICATORS = {
  patients: {
    load: getDashboardPatients,
    area: PATHS.PATIENTS,
    usesPeriod: true,
    render: (data) => (
      <>
        <Summary items={content.patients.summary(data)} />
        <CountTable
          label={content.patients.byResponsible}
          header={content.patients.responsible}
          columns={[content.patients.active]}
          rows={data.byResponsible.map((row) => [
            row.professional.name,
            row.active,
          ])}
        />
      </>
    ),
  },
  users: {
    load: getDashboardUsers,
    area: PATHS.USERS,
    usesPeriod: false,
    render: (data) => (
      <>
        <Summary items={content.users.summary(data)} />
        <CountTable
          label={content.users.byProfile}
          header={content.users.profile}
          columns={content.users.columns}
          rows={data.byProfile.map((row) => [
            profileLabels[row.profile.code],
            row.active,
            row.pending,
            row.inactive,
          ])}
        />
      </>
    ),
  },
  followUps: {
    load: getDashboardFollowUps,
    area: PATHS.RECORDS,
    usesPeriod: true,
    render: (data) => (
      <>
        <Summary items={content.followUps.summary(data)} />
        <DayChart label={content.followUps.chartLabel} byDay={data.byDay} />
        <CountTable
          label={content.followUps.byForm}
          header={content.followUps.form}
          columns={[content.total]}
          rows={data.byForm.map((row) => [row.form.name, row.total])}
        />
        <CountTable
          label={content.followUps.byAuthor}
          header={content.followUps.author}
          columns={[content.total]}
          rows={data.byAuthor.map((row) => [row.user.name, row.total])}
        />
      </>
    ),
  },
  alerts: {
    load: getDashboardAlerts,
    area: PATHS.ALERTS,
    usesPeriod: true,
    render: (data) => (
      <>
        <Summary items={content.alerts.summary(data)} />
        <CountTable
          label={content.alerts.bySeverity}
          header={content.alerts.severity}
          columns={[content.total]}
          rows={severityRows(data.bySeverity)}
        />
        <CountTable
          label={content.alerts.bySource}
          header={content.alerts.source}
          columns={[content.total]}
          rows={Object.entries(data.bySource).map(([source, total]) => [
            alertSourceLabels[source],
            total,
          ])}
        />
        <CountTable
          label={content.alerts.pending}
          header={content.alerts.severity}
          columns={[content.total]}
          rows={severityRows(data.pending.bySeverity)}
        />
      </>
    ),
  },
};

function Indicator({ id }) {
  const { shortcut, period, setShortcut } = useDashboardPeriod();
  const indicator = INDICATORS[id];
  const load = useCallback(
    () => indicator.load(indicator.usesPeriod ? period : undefined),
    [indicator, period],
  );
  const resource = useResource(load);
  return (
    <>
      <PageHeader
        title={content.titles[id]}
        subtitle={
          indicator.usesPeriod
            ? dashboardContent.period(
                shortcut,
                formatDate(period.from),
                formatDate(period.to),
              )
            : undefined
        }
        breadcrumbs={[
          {
            label: navLabels.dashboard,
            to: dashboardPath(
              shortcut === DEFAULT_SHORTCUT ? undefined : shortcut,
            ),
          },
        ]}
        actions={
          indicator.usesPeriod ? (
            <PeriodShortcuts value={shortcut} onChange={setShortcut} />
          ) : null
        }
      />
      <ResourceState resource={resource}>
        {(data, meta) => (
          <Stack spacing={2.5}>
            {meta.message ? (
              <Typography color="text.secondary">{meta.message}</Typography>
            ) : null}
            {indicator.render(data)}
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                to={dashboardPath(
                  shortcut === DEFAULT_SHORTCUT ? undefined : shortcut,
                )}
              >
                {content.backToDashboard}
              </Button>
              <Button
                component={RouterLink}
                to={indicator.area}
                variant="outlined"
              >
                {content[id].areaLink}
              </Button>
            </Stack>
          </Stack>
        )}
      </ResourceState>
    </>
  );
}

/** Detalhe de um indicador do painel (UC05, passo 4). */
export default function DashboardIndicatorPage() {
  const { indicator } = useParams();
  const id = indicatorFromSlug(indicator);
  if (!id) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Box>
          <Button
            component={RouterLink}
            to={PATHS.DASHBOARD}
            variant="contained"
          >
            {content.backToDashboard}
          </Button>
        </Box>
      </Stack>
    );
  }
  return <Indicator id={id} />;
}

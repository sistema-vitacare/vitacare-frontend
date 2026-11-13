import {
  Alert,
  Box,
  Button,
  Card,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useCallback } from 'react';
import { Link as RouterLink } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SeverityChip from '../../components/SeverityChip.jsx';
import { DASHBOARD_INDICATORS } from '../../constants/dashboard.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import {
  PATHS,
  alertPath,
  dashboardIndicatorPath,
  recordPath,
} from '../../constants/routes.js';
import { alertOperatorLabels } from '../../data/alertPages.js';
import { dashboardContent as content } from '../../data/dashboardPages.js';
import { useDashboardPeriod } from '../../hooks/useDashboardPeriod.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { getDashboard } from '../../services/dashboardService.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import PeriodShortcuts from './PeriodShortcuts.jsx';

const PLAN_UNAVAILABLE = 'DASHBOARD_PLAN_FEATURE_UNAVAILABLE';

function Indicators({ data, shortcut }) {
  const values = content.indicatorValue(data);
  return (
    <Box
      component="ul"
      aria-label={content.indicatorsLabel}
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
      }}
    >
      {DASHBOARD_INDICATORS.map((id) => {
        const indicator = content.indicators[id];
        return (
          <li key={id}>
            <Card
              component={RouterLink}
              to={dashboardIndicatorPath(id, shortcut)}
              sx={{
                display: 'block',
                height: '100%',
                p: { xs: 2, md: 2.5 },
                color: 'inherit',
                textDecoration: 'none',
                transition: 'transform 160ms ease-out',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {indicator.label}
              </Typography>
              <Typography
                component="p"
                sx={{ typography: { xs: 'h2', sm: 'h1' }, my: 0.5 }}
              >
                {values[id]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {indicator.detail(data, shortcut)}
              </Typography>
            </Card>
          </li>
        );
      })}
    </Box>
  );
}

function RecordsChart({ byDay }) {
  return (
    <SectionCard title={content.chart.title}>
      <Box component="figure" aria-label={content.chart.label} sx={{ m: 0 }}>
        <BarChart
          height={240}
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
              label: content.chart.series,
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

function PriorityAlerts({ alerts }) {
  return (
    <SectionCard title={content.priority.title}>
      {alerts.length === 0 ? (
        <Typography color="text.secondary">{content.priority.empty}</Typography>
      ) : (
        <Stack
          component="ul"
          aria-label={content.priority.title}
          spacing={1}
          sx={{ m: 0, p: 0, listStyle: 'none' }}
        >
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                component={RouterLink}
                to={alertPath(alert.id)}
                underline="none"
                color="inherit"
                sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
              >
                <SeverityChip severity={alert.severity} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {alert.patient.name}
                  </Typography>
                  <Typography variant="body2">{alert.title}</Typography>
                  {alert.reading ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="p"
                    >
                      {content.priority.reading(
                        alert.reading,
                        alertOperatorLabels[alert.reading.operator],
                      )}
                      {' · '}
                      {content.priority.author(alert.reading.author.name)}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(alert.generatedAt)}
                  </Typography>
                </Box>
              </Link>
            </li>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function LatestFollowUps({ followUps }) {
  return (
    <SectionCard title={content.latest.title}>
      {followUps.length === 0 ? (
        <Typography color="text.secondary">{content.latest.empty}</Typography>
      ) : (
        <Box
          component="ul"
          aria-label={content.latest.title}
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          {followUps.map((followUp) => (
            <li key={followUp.id}>
              <Link
                component={RouterLink}
                to={recordPath(followUp.id)}
                underline="none"
                color="inherit"
                sx={{ display: 'block' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {followUp.patient.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {content.latest.detail(
                    followUp.form.name,
                    followUp.author.name,
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(followUp.visitedAt)}
                </Typography>
              </Link>
            </li>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

function PlanUnavailable({ message }) {
  const { can } = useSession();
  return (
    <Alert
      severity="info"
      action={
        can(P.ORGANIZATION_READ) ? (
          <Button component={RouterLink} to={PATHS.SETTINGS} color="inherit">
            {content.plan.action}
          </Button>
        ) : null
      }
    >
      {message}
    </Alert>
  );
}

/** Painel operacional da organização (RF015, UC05, Figura 33). */
export default function DashboardPage() {
  const { shortcut, period, setShortcut } = useDashboardPeriod();
  const load = useCallback(() => getDashboard(period), [period]);
  const resource = useResource(load);
  const planUnavailable =
    resource.status === 'error' && resource.error.code === PLAN_UNAVAILABLE;
  return (
    <>
      <PageHeader
        title={content.title}
        subtitle={content.period(
          shortcut,
          formatDate(period.from),
          formatDate(period.to),
        )}
        actions={<PeriodShortcuts value={shortcut} onChange={setShortcut} />}
      />
      {planUnavailable ? (
        <PlanUnavailable message={resource.error.message} />
      ) : (
        <ResourceState resource={resource} errorText={content.errorText}>
          {(data, meta) => (
            <Stack spacing={2.5}>
              {meta.message ? (
                <Alert severity="info">{meta.message}</Alert>
              ) : null}
              <Indicators data={data} shortcut={shortcut} />
              <Box
                sx={{
                  display: 'grid',
                  gap: 2.5,
                  alignItems: 'start',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    lg: 'minmax(0, 2fr) minmax(0, 1fr)',
                  },
                }}
              >
                <RecordsChart byDay={data.followUps.byDay} />
                <PriorityAlerts alerts={data.priorityAlerts} />
              </Box>
              <LatestFollowUps followUps={data.latestFollowUps} />
            </Stack>
          )}
        </ResourceState>
      )}
    </>
  );
}

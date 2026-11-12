import {
  Alert,
  Box,
  Button,
  Card,
  Pagination,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SeverityChip from '../../components/SeverityChip.jsx';
import { ALERT_SEVERITIES, SEVERITY_TONE } from '../../constants/alerts.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { alertPath } from '../../constants/routes.js';
import {
  alertListContent as content,
  alertSourceLabels,
} from '../../data/alertPages.js';
import { severityLabels } from '../../data/patientFields.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listPatientAlerts } from '../../services/alertService.js';
import { formatDateTime } from '../../utils/format.js';
import ResolveAlertButton from './ResolveAlertButton.jsx';

const PARAMS = { tab: 'aba', page: 'pagina' };
const PAGE_SIZE = 20;

// Abas da Figura 42: abertos, os abertos de cada severidade e os
// resolvidos. A primeira é a padrão e não aparece no endereço.
const TABS = [
  { key: 'open', slug: 'abertos', query: { status: 'open' } },
  {
    key: 'critical',
    slug: 'critico',
    query: { status: 'open', severity: 'critical' },
  },
  {
    key: 'warning',
    slug: 'atencao',
    query: { status: 'open', severity: 'warning' },
  },
  {
    key: 'info',
    slug: 'informativo',
    query: { status: 'open', severity: 'info' },
  },
  { key: 'resolved', slug: 'resolvidos', query: { status: 'resolved' } },
];

/**
 * A API não devolve contagens: cada contador é o `total` da lista dos
 * abertos daquela severidade, pedida com um item só.
 */
function openCountsLoader(patientId) {
  return async () => {
    const responses = await Promise.all(
      ALERT_SEVERITIES.map((severity) =>
        listPatientAlerts({ patientId, severity, status: 'open', limit: 1 }),
      ),
    );
    return {
      data: Object.fromEntries(
        ALERT_SEVERITIES.map((severity, index) => [
          severity,
          responses[index].meta.pagination.total,
        ]),
      ),
      meta: {},
    };
  };
}

function Counters({ counts }) {
  return (
    <Box
      component="ul"
      aria-label={content.countersLabel}
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        // Três colunas também no celular: os números são curtos, e os
        // contadores empilhados empurrariam a lista para fora da tela.
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: { xs: 1, sm: 2 },
      }}
    >
      {ALERT_SEVERITIES.map((severity) => (
        <Card
          key={severity}
          component="li"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderTop: 3,
            borderTopColor: `${SEVERITY_TONE[severity]}.main`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {severityLabels[severity]}
          </Typography>
          <Typography component="p" sx={{ typography: { xs: 'h2', sm: 'h1' } }}>
            {counts[severity]}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}

function AlertItem({ alert, canResolve, onResolved }) {
  return (
    <Stack
      component="li"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        py: 2,
        alignItems: { sm: 'flex-start' },
        '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
      }}
    >
      <Box sx={{ flexShrink: 0, minWidth: 96 }}>
        <SeverityChip severity={alert.severity} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {alert.title}
        </Typography>
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {alert.message}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          <span>{alertSourceLabels[alert.source]}</span> ·{' '}
          {formatDateTime(alert.generatedAt)}
        </Typography>
        {alert.resolution ? (
          <Typography variant="caption" color="text.secondary" component="p">
            {content.resolvedBy(
              alert.resolution.resolvedBy.name,
              formatDateTime(alert.resolution.resolvedAt),
            )}
          </Typography>
        ) : null}
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        {canResolve && alert.status === 'open' ? (
          <ResolveAlertButton alert={alert} onResolved={onResolved} />
        ) : null}
        <Button
          size="small"
          component={RouterLink}
          to={alertPath(alert.id)}
          aria-label={content.viewOf(alert.title)}
        >
          {content.view}
        </Button>
      </Stack>
    </Stack>
  );
}

function PatientAlerts({ patient }) {
  const { can } = useSession();
  const [params, setParams] = useSearchParams();
  const tab =
    TABS.find((item) => item.slug === params.get(PARAMS.tab)) ?? TABS[0];
  const page = Math.max(1, Number(params.get(PARAMS.page)) || 1);
  const [notice, setNotice] = useState(null);

  const loadCounts = useCallback(
    () => openCountsLoader(patient.id)(),
    [patient.id],
  );
  const counts = useResource(loadCounts);
  const loadAlerts = useCallback(
    () =>
      listPatientAlerts({
        patientId: patient.id,
        ...tab.query,
        page,
        limit: PAGE_SIZE,
      }),
    [patient.id, tab, page],
  );
  const alerts = useResource(loadAlerts);

  function change({ tab: nextTab = tab, page: nextPage = 1 }) {
    setNotice(null);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextTab === TABS[0]) {
          next.delete(PARAMS.tab);
        } else {
          next.set(PARAMS.tab, nextTab.slug);
        }
        if (nextPage === 1) {
          next.delete(PARAMS.page);
        } else {
          next.set(PARAMS.page, String(nextPage));
        }
        return next;
      },
      { replace: true },
    );
  }

  function resolved({ alreadyResolved }) {
    setNotice(
      alreadyResolved
        ? { severity: 'info', text: content.alreadyResolved }
        : { severity: 'success', text: content.resolved },
    );
    counts.retry();
    alerts.retry();
  }

  const openTotal =
    counts.status === 'success'
      ? ALERT_SEVERITIES.reduce(
          (sum, severity) => sum + counts.data[severity],
          0,
        )
      : null;
  const tabLabel = (item) => {
    const label = content.tabs[item.key];
    if (counts.status !== 'success' || item.key === 'resolved') {
      return label;
    }
    const count = item.key === 'open' ? openTotal : counts.data[item.key];
    return content.tabLabel(label, count);
  };

  return (
    <Stack spacing={2.5}>
      <ResourceState resource={counts}>
        {(data) => <Counters counts={data} />}
      </ResourceState>
      {notice ? (
        <Alert severity={notice.severity} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}
      <Card sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
        <Tabs
          value={tab.slug}
          onChange={(_, slug) =>
            change({ tab: TABS.find((item) => item.slug === slug) })
          }
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label={content.tabsLabel}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((item) => (
            <Tab key={item.slug} value={item.slug} label={tabLabel(item)} />
          ))}
        </Tabs>
        <ResourceState resource={alerts} emptyText={content.empty[tab.key]}>
          {(items, meta) => (
            <>
              <Box
                component="ul"
                aria-label={content.listLabel}
                sx={{ m: 0, p: 0, listStyle: 'none' }}
              >
                {items.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    canResolve={can(P.ALERTS_RESOLVE)}
                    onResolved={resolved}
                  />
                ))}
              </Box>
              {meta.pagination.totalPages > 1 ? (
                <Pagination
                  count={meta.pagination.totalPages}
                  page={page}
                  onChange={(_, value) => change({ page: value })}
                  sx={{ py: 2, display: 'flex', justifyContent: 'center' }}
                />
              ) : null}
            </>
          )}
        </ResourceState>
      </Card>
    </Stack>
  );
}

/** Alertas de um paciente (menu Alertas; RF014, UC13, Figura 42). */
export default function AlertListPage() {
  return (
    <>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <PatientPicker content={content.picker}>
        {(patient) => <PatientAlerts key={patient.id} patient={patient} />}
      </PatientPicker>
    </>
  );
}

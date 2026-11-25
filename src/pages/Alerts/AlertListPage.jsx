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
import { useNotifications } from '../../hooks/useNotifications.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { getAlertSummary, listAlerts } from '../../services/alertService.js';
import { readAllNotifications } from '../../services/notificationService.js';
import { formatDateTime } from '../../utils/format.js';
import ResolveAlertButton from './ResolveAlertButton.jsx';

const PARAMS = { tab: 'aba', page: 'pagina' };
const PAGE_SIZE = 20;

// Abas da Figura 42 (tabela de montagem em `alerts-listar.md`): todos os
// abertos, os abertos de cada severidade, por prioridade, e os resolvidos. A
// primeira é a padrão e não aparece no endereço.
const OPEN = { status: 'open', sort: 'priority' };
const TABS = [
  { key: 'open', slug: 'abertos', query: OPEN },
  {
    key: 'critical',
    slug: 'critico',
    query: { ...OPEN, severity: 'critical' },
  },
  {
    key: 'warning',
    slug: 'atencao',
    query: { ...OPEN, severity: 'warning' },
  },
  {
    key: 'info',
    slug: 'informativo',
    query: { ...OPEN, severity: 'info' },
  },
  { key: 'resolved', slug: 'resolvidos', query: { status: 'resolved' } },
];

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
        <Typography variant="body2" color="text.secondary">
          {content.patient(alert.patient.name, alert.patient.mainCondition)}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          <span>{alertSourceLabels[alert.source]}</span> ·{' '}
          {alert.followUp?.author
            ? `${content.recordedBy(alert.followUp.author.name)} · `
            : null}
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

/** Alertas de todos os pacientes ao alcance ou, com `patientId`, de um só. */
function Alerts({ patientId }) {
  const { can } = useSession();
  const notifications = useNotifications();
  const [params, setParams] = useSearchParams();
  const tab =
    TABS.find((item) => item.slug === params.get(PARAMS.tab)) ?? TABS[0];
  const page = Math.max(1, Number(params.get(PARAMS.page)) || 1);
  const [notice, setNotice] = useState(null);

  const loadSummary = useCallback(
    () => getAlertSummary({ patientId }),
    [patientId],
  );
  const summary = useResource(loadSummary);
  const loadAlerts = useCallback(
    () => listAlerts({ patientId, ...tab.query, page, limit: PAGE_SIZE }),
    [patientId, tab, page],
  );
  const alerts = useResource(loadAlerts);
  const readAll = useCallback(
    () => readAllNotifications(patientId ? { patientId } : {}),
    [patientId],
  );
  const markAll = useSubmit(readAll);

  async function markAllRead() {
    const outcome = await markAll.submit();
    setNotice(
      outcome.error
        ? { severity: 'error', text: content.readAllFailed }
        : { severity: 'success', text: content.allRead(outcome.data.updated) },
    );
    if (!outcome.error) {
      notifications.refresh();
    }
  }

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
    summary.retry();
    alerts.retry();
  }

  // O número ao lado de cada aba é o do resumo: `total` em Todos e o da
  // severidade nas outras; Resolvidos não tem número.
  const tabLabel = (item) => {
    const label = content.tabs[item.key];
    if (summary.status !== 'success' || item.key === 'resolved') {
      return label;
    }
    const { open } = summary.data;
    return content.tabLabel(
      label,
      item.key === 'open' ? open.total : open[item.key],
    );
  };

  return (
    <Stack spacing={2.5}>
      <ResourceState resource={summary}>
        {(data) => <Counters counts={data.open} />}
      </ResourceState>
      <Box>
        <Button
          variant="outlined"
          onClick={markAllRead}
          loading={markAll.status === 'submitting'}
          disabled={notifications.unread === 0}
        >
          {content.readAll}
        </Button>
      </Box>
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

/**
 * Alertas dos pacientes ao alcance da sessão, com o paciente como filtro
 * opcional (menu Alertas; RF014, UC13, Figura 42, BE-33).
 */
export default function AlertListPage() {
  return (
    <>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <PatientPicker content={content.picker} optional>
        {(patient) => (
          <Alerts key={patient?.id ?? ''} patientId={patient?.id} />
        )}
      </PatientPicker>
    </>
  );
}

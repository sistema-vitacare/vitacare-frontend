import {
  Alert,
  Box,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import PageHeader from '../../components/PageHeader.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATIENT_PARAM } from '../../constants/routes.js';
import { reportsPageContent as content } from '../../data/managementReports.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { listManagementReports } from '../../services/managementReportService.js';
import AlertsReport from './AlertsReport.jsx';
import CaregiversReport from './CaregiversReport.jsx';
import PatientReport from './PatientReport.jsx';
import RecentReports from './RecentReports.jsx';

// Tipo no endereço, em português, como os outros filtros.
const TYPE_PARAM = 'tipo';
const TYPE_SLUGS = {
  patient_follow_up: 'paciente',
  alerts: 'alertas',
  caregiver_activity: 'cuidadores',
};
const TYPE_BY_SLUG = Object.fromEntries(
  Object.entries(TYPE_SLUGS).map(([type, slug]) => [slug, type]),
);
const DEFAULT_TYPE = 'patient_follow_up';

function TypeCards({ types, selected }) {
  return (
    <Box
      component="nav"
      aria-label={content.typesLabel}
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
      }}
    >
      {types.map((item) => {
        const current = item.type === selected;
        return (
          <Card
            key={item.type}
            variant="outlined"
            sx={{
              borderColor: current ? 'primary.main' : 'divider',
              borderWidth: current ? 2 : 1,
            }}
          >
            <CardActionArea
              component={RouterLink}
              to={{ search: `?${TYPE_PARAM}=${TYPE_SLUGS[item.type]}` }}
              aria-current={current ? 'page' : undefined}
              sx={{ p: 2, height: '100%', alignItems: 'flex-start' }}
            >
              <Typography variant="h3">{item.name}</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {item.description}
              </Typography>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ display: 'block', mt: 1, fontWeight: 650 }}
              >
                {content.exported(item.exportCount)}
              </Typography>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}

const REPORTS = {
  patient_follow_up: PatientReport,
  alerts: AlertsReport,
  caregiver_activity: CaregiversReport,
};

/**
 * Relatórios (Figura 43). Quem gera os gerenciais escolhe entre os três
 * tipos e vê os relatórios recentes; quem só gera o do paciente vê só ele.
 * No plano sem o recurso, a parte gerencial dá lugar à mensagem da API.
 */
export default function ReportsPage() {
  const { can } = useSession();
  const [params, setParams] = useSearchParams();
  const catalog = useResource(listManagementReports);
  const [recentKey, setRecentKey] = useState(0);

  if (!can(P.MANAGEMENT_REPORTS_GENERATE)) {
    return (
      <>
        <PageHeader title={content.title} />
        <PatientReport />
      </>
    );
  }

  const types = catalog.data;
  const unavailable =
    catalog.status === 'error' &&
    catalog.error.code === 'MANAGEMENT_REPORT_PLAN_FEATURE_UNAVAILABLE';
  const selected = TYPE_BY_SLUG[params.get(TYPE_PARAM)] ?? DEFAULT_TYPE;
  const Report = REPORTS[unavailable ? DEFAULT_TYPE : selected];

  // A exportação entra na auditoria: os "gerados" e os recentes mudam.
  function exported() {
    catalog.retry();
    setRecentKey((key) => key + 1);
  }

  function generateAgain(item) {
    const next = new URLSearchParams({ [TYPE_PARAM]: TYPE_SLUGS[item.type] });
    if (item.scope.patient) {
      next.set(PATIENT_PARAM, item.scope.patient.id);
    }
    next.set('de', item.period.from);
    next.set('ate', item.period.to);
    if (item.scope.condition) {
      next.set('condicao', item.scope.condition);
    }
    setParams(next);
  }

  return (
    <>
      <PageHeader title={content.title} />
      <Stack spacing={2.5}>
        {unavailable ? (
          <Alert severity="info">{catalog.error.message}</Alert>
        ) : null}
        {types ? <TypeCards types={types} selected={selected} /> : null}
        <Report key={selected} onExported={exported} />
        {types ? (
          <RecentReports
            key={recentKey}
            typeNames={Object.fromEntries(
              types.map((item) => [item.type, item.name]),
            )}
            onAgain={generateAgain}
          />
        ) : null}
      </Stack>
    </>
  );
}

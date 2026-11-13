import { Box, Button, Stack, Typography } from '@mui/material';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { recentReportsContent as content } from '../../data/managementReports.js';
import { useResource } from '../../hooks/useResource.js';
import { listRecentReports } from '../../services/managementReportService.js';
import { formatDate, formatDateTime } from '../../utils/format.js';

const RECENT_LIMIT = 10;
const loadRecent = () => listRecentReports({ limit: RECENT_LIMIT });

function scopeText({ kind, patient, condition }) {
  if (kind === 'patient') {
    return content.scope.patient(patient?.name);
  }
  return kind === 'condition'
    ? content.scope.condition(condition)
    : content.scope.all;
}

/**
 * Relatórios recentes (Figura 43): as exportações em PDF da organização,
 * que a API monta pela auditoria. Nada fica guardado, então "Gerar de
 * novo" abre o mesmo tipo, escopo e período, e não baixa o arquivo antigo.
 */
export default function RecentReports({ typeNames, onAgain }) {
  const resource = useResource(loadRecent);
  return (
    <SectionCard title={content.title}>
      <ResourceState resource={resource} emptyText={resource.meta?.message}>
        {(items) => (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {items.map((item) => (
              <Stack
                component="li"
                key={item.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  py: 1.25,
                  justifyContent: 'space-between',
                  alignItems: { sm: 'center' },
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {typeNames[item.type]} · {scopeText(item.scope)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {content.period(
                      formatDate(item.period.from),
                      formatDate(item.period.to),
                    )}{' '}
                    ·{' '}
                    {content.generated(
                      item.generatedBy?.name,
                      formatDateTime(item.generatedAt),
                    )}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAgain(item)}
                  sx={{
                    flexShrink: 0,
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                  }}
                >
                  {content.again}
                </Button>
              </Stack>
            ))}
          </Box>
        )}
      </ResourceState>
    </SectionCard>
  );
}

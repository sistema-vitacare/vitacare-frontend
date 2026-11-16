import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  planFeatureLabels,
  planSummaryContent as content,
} from '../data/planSummary.js';
import { formatDate, formatNumber, todayInSaoPaulo } from '../utils/format.js';

// Dia de Brasília de um instante da API, como a mensagem de vencimento.
const day = (instant) => formatDate(todayInSaoPaulo(new Date(instant)));

// Uso como a API manda: depois de um rebaixamento, ele pode passar do
// limite, e a barra só fica cheia.
function Usage({ label, used, limit }) {
  return (
    <Box component="li" sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h2" component="p">
        {content.usageValue(formatNumber(used), formatNumber(limit))}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={limit > 0 ? Math.min(100, (used / limit) * 100) : 100}
        color={used >= limit ? 'warning' : 'primary'}
        aria-label={label}
        sx={{ mt: 1, height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

/**
 * Plano de uma organização como a API o devolve (UC04): o aviso de
 * vencimento que ela manda em `meta.message`, plano com descrição e
 * recursos, vigência, e limites e uso de usuários e pacientes.
 */
export default function PlanSummary({ data, meta }) {
  const { plan, term, limits, usage } = data;
  const expired = term.status === 'expired';

  return (
    <Stack spacing={2.5}>
      {meta?.message ? (
        <Alert severity={expired ? 'error' : 'warning'}>{meta.message}</Alert>
      ) : null}
      <Box>
        <Stack
          direction="row"
          sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}
        >
          <Typography variant="h2" component="p">
            {plan.name}
          </Typography>
          {expired ? (
            <Chip
              size="small"
              label={content.expired}
              sx={{ bgcolor: 'error.light', color: 'error.main' }}
            />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {plan.description}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {content.term(
            day(term.startsAt),
            term.endsAt ? day(term.endsAt) : null,
          )}
        </Typography>
      </Box>
      <Box
        component="ul"
        aria-label={content.featuresLabel}
        sx={{
          m: 0,
          pl: 2.5,
          display: 'grid',
          gap: 0.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        {plan.features.map((feature) => (
          <Typography component="li" variant="body2" key={feature}>
            {planFeatureLabels[feature] ?? feature}
          </Typography>
        ))}
      </Box>
      <Box
        component="ul"
        aria-label={content.usageLabel}
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Usage
          label={content.usage.users}
          used={usage.users}
          limit={limits.users}
        />
        <Usage
          label={content.usage.patients}
          used={usage.patients}
          limit={limits.patients}
        />
      </Box>
    </Stack>
  );
}

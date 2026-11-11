import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

/**
 * Cabeçalho das telas do layout autenticado: trilha de navegação, título
 * principal, subtítulo e, à direita, as ações da tela.
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs sx={{ mb: 1, typography: 'body2' }}>
            {breadcrumbs.map((crumb) => (
              <Link
                key={crumb.to}
                component={RouterLink}
                to={crumb.to}
                underline="hover"
                color="text.secondary"
              >
                {crumb.label}
              </Link>
            ))}
            <Typography variant="body2" color="text.primary" noWrap>
              {title}
            </Typography>
          </Breadcrumbs>
        ) : null}
        <Typography variant="h1" sx={{ overflowWrap: 'anywhere' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}
        >
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

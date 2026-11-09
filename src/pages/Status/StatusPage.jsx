import { Box, Button, Stack, Typography } from '@mui/material';
import { Compass, Hammer, LockKey, WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { PATHS } from '../../constants/routes.js';
import { statusContent } from '../../data/status.js';

const icons = {
  notFound: Compass,
  accessDenied: LockKey,
  error: WarningCircle,
  underConstruction: Hammer,
};

/**
 * Molde das páginas de estado: não encontrada, acesso negado, erro
 * inesperado e tela em construção. `title` substitui o título padrão; a
 * tela em construção usa o nome da tela.
 */
export default function StatusPage({ kind, title }) {
  const content = statusContent[kind];
  const Icon = icons[kind];

  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 440,
        mx: 'auto',
        py: { xs: 6, md: 10 },
        px: 2,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'primary.light',
          color: 'primary.dark',
        }}
      >
        <Icon size={30} aria-hidden="true" />
      </Box>
      <Typography variant="h5" component="h1">
        {title ?? content.title}
      </Typography>
      <Typography color="text.secondary">{content.text}</Typography>
      {content.action ? (
        <Button component={Link} to={PATHS.HOME} variant="contained">
          {content.action}
        </Button>
      ) : null}
    </Stack>
  );
}

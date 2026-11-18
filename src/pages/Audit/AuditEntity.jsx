import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import {
  auditEntityLabels,
  auditListContent as content,
} from '../../data/auditPages.js';
import { profileLabels } from '../../data/profiles.js';

/** Responsável pelo evento; o evento de sistema não tem usuário. */
export function ActorName({ event }) {
  return event.actor.type === 'system'
    ? content.system
    : (event.actor.user?.name ?? content.none);
}

/**
 * Perfil no instante da ação, pelo código: o nome da API vem sem acento.
 * Evento de sistema e evento anterior ao BE-23 não têm perfil.
 */
export function ActorProfile({ event }) {
  const { profile } = event.actor;
  return profile ? (profileLabels[profile.code] ?? profile.name) : content.none;
}

/**
 * Item afetado: o nome, quando a API manda, e o tipo. Com `to`, o nome vira
 * link para a tela do item.
 */
export default function AuditEntity({ entity, to }) {
  const type = auditEntityLabels[entity.type] ?? entity.type;
  if (!entity.label) {
    return to ? (
      <Link component={RouterLink} to={to} underline="hover">
        {type}
      </Link>
    ) : (
      type
    );
  }
  return (
    <Box component="span" sx={{ display: 'block', minWidth: 0 }}>
      {to ? (
        <Link
          component={RouterLink}
          to={to}
          underline="hover"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {entity.label}
        </Link>
      ) : (
        <Box component="span" sx={{ overflowWrap: 'anywhere' }}>
          {entity.label}
        </Box>
      )}
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block' }}
      >
        {type}
      </Typography>
    </Box>
  );
}

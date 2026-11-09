import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { NavLink, useMatch } from 'react-router';
import { NAV_GROUPS } from '../constants/routes.js';
import { navGroupLabels, navLabels } from '../data/navigation.js';

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  const active = useMatch({ path: item.path, end: false }) !== null;
  return (
    <ButtonBase
      component={NavLink}
      to={item.path}
      onClick={onNavigate}
      sx={(theme) => ({
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.5,
        px: 1.5,
        py: 1.1,
        borderRadius: 1,
        color: 'text.secondary',
        fontSize: '0.875rem',
        fontWeight: 500,
        '&:hover': { bgcolor: alpha(theme.palette.brand.navy, 0.04) },
        // O NavLink põe a classe `active` e `aria-current="page"` no item da
        // tela aberta. Sobre o fundo teal-claro, o texto usa o teal escuro,
        // que mantém o contraste mínimo (ver docs/arquitetura.md).
        '&.active, &.active:hover': {
          color: 'primary.dark',
          bgcolor: 'primary.light',
          fontWeight: 650,
        },
      })}
    >
      <Icon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
      {navLabels[item.id]}
    </ButtonBase>
  );
}

/** Itens do menu agrupados, na ordem de `NAV_GROUPS`; grupos vazios somem. */
export default function NavList({ items, onNavigate }) {
  const groups = NAV_GROUPS.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter(({ items: groupItems }) => groupItems.length > 0);

  return (
    <Stack spacing={3}>
      {groups.map(({ group, items: groupItems }) => (
        <Box key={group}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 1.5, display: 'block', mb: 0.5 }}
          >
            {navGroupLabels[group]}
          </Typography>
          <Stack component="ul" spacing={0.25} sx={{ m: 0, p: 0 }}>
            {groupItems.map((item) => (
              <Box component="li" key={item.id} sx={{ listStyle: 'none' }}>
                <NavItem item={item} onNavigate={onNavigate} />
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

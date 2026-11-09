import { Box, Drawer, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { usesBottomNav, visibleNavItems } from '../constants/routes.js';
import { shellContent } from '../data/navigation.js';
import { useSession } from '../hooks/useSession.js';
import BottomNav from './BottomNav.jsx';
import NavList from './NavList.jsx';
import TopBar from './TopBar.jsx';

const SIDEBAR_WIDTH = 264;

// Conteúdo do menu lateral, usado fixo no computador e dentro do menu
// recolhível no celular.
function Sidebar({ items, organizationName, onNavigate }) {
  return (
    <Box
      component="nav"
      aria-label={shellContent.mainNavLabel}
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 3,
        overflowY: 'auto',
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: 'center', px: 1.5, mb: 4 }}
      >
        <Box
          component="img"
          src="/logo-mark.png"
          alt=""
          sx={{ height: 26, display: 'block' }}
        />
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: '1.125rem',
            letterSpacing: '-0.02em',
          }}
        >
          {shellContent.brandStart}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {shellContent.brandEnd}
          </Box>
        </Typography>
      </Stack>

      <Box sx={{ flex: 1 }}>
        <NavList items={items} onNavigate={onNavigate} />
      </Box>

      <Box
        sx={{
          mt: 3,
          p: 1.5,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {shellContent.organizationLabel}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {organizationName}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Layout das rotas autenticadas. No computador, menu lateral fixo; no
 * celular, menu recolhível ou, para quem registra visita, barra inferior.
 */
export default function AppShell() {
  const { session, can } = useSession();
  const theme = useTheme();
  // `noSsr` lê a largura já na primeira renderização; sem ele, o layout de
  // celular aparece por um instante antes do de computador.
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = visibleNavItems(can);
  const bottomNav = !isDesktop && usesBottomNav(can);
  const drawerNav = !isDesktop && !bottomNav;
  const organizationName = session.organization.tradeName;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: 'background.default',
      }}
    >
      {isDesktop ? (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            height: '100dvh',
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Sidebar items={items} organizationName={organizationName} />
        </Box>
      ) : null}

      {drawerNav ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar
            items={items}
            organizationName={organizationName}
            onNavigate={() => setDrawerOpen(false)}
          />
        </Drawer>
      ) : null}

      <Box
        sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <TopBar
          onOpenMenu={drawerNav ? () => setDrawerOpen(true) : undefined}
          showBrand={!isDesktop}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 4 },
            pt: { xs: 3, md: 4 },
            // Espaço para a barra inferior fixa não cobrir o fim da tela.
            pb: bottomNav ? 12 : { xs: 3, md: 4 },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {bottomNav ? <BottomNav items={items} /> : null}
    </Box>
  );
}

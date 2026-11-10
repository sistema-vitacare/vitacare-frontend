import {
  Avatar,
  Box,
  ButtonBase,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CaretDown, List, SignOut } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { shellContent } from '../data/navigation.js';
import { profileLabels } from '../data/profiles.js';
import { useSession } from '../hooks/useSession.js';
import { initials } from '../utils/initials.js';

/**
 * Barra superior do layout autenticado: botão do menu recolhível (quando
 * `onOpenMenu` existe), símbolo da marca no celular e menu do usuário com o
 * Sair, presente em todos os layouts.
 */
export default function TopBar({ onOpenMenu, showBrand }) {
  const { session, signOut } = useSession();
  const [anchor, setAnchor] = useState(null);
  const menuId = useId();
  const { user } = session;

  function handleSignOut() {
    setAnchor(null);
    signOut();
  }

  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: { xs: 2, md: 4 },
        py: 1.5,
        bgcolor: alpha(theme.palette.background.default, 0.85),
        backdropFilter: 'blur(12px)',
        borderBottom: 1,
        borderColor: 'divider',
      })}
    >
      {onOpenMenu ? (
        <IconButton
          aria-label={shellContent.openMenu}
          onClick={onOpenMenu}
          edge="start"
        >
          <List size={22} aria-hidden="true" />
        </IconButton>
      ) : null}
      {showBrand ? (
        <Box
          component="img"
          src="/logo-mark.png"
          alt=""
          sx={{ height: 24, display: 'block' }}
        />
      ) : null}
      <Box sx={{ flex: 1 }} />
      <ButtonBase
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          gap: 1.25,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          textAlign: 'left',
          minWidth: 0,
        }}
      >
        <Avatar
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.light',
            color: 'primary.dark',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          {initials(user.name)}
        </Avatar>
        <Box sx={{ minWidth: 0, maxWidth: { xs: 140, sm: 220 } }}>
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: 650, lineHeight: 1.3 }}
          >
            {user.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {profileLabels[user.profile.code]}
          </Typography>
        </Box>
        <CaretDown size={16} aria-hidden="true" />
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <SignOut size={20} aria-hidden="true" />
          </ListItemIcon>
          {shellContent.signOut}
        </MenuItem>
      </Menu>
    </Box>
  );
}

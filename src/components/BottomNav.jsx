import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  bottomNavigationActionClasses as actionClasses,
} from '@mui/material';
import { NavLink, matchPath, useLocation } from 'react-router';
import { navLabels, shellContent } from '../data/navigation.js';

/**
 * Barra inferior do celular para quem registra visita: os mesmos itens do
 * menu, ao alcance do polegar.
 */
export default function BottomNav({ items }) {
  const { pathname } = useLocation();
  const current = items.find((item) =>
    matchPath({ path: item.path, end: false }, pathname),
  );

  return (
    <Paper
      component="nav"
      aria-label={shellContent.mainNavLabel}
      elevation={0}
      square
      sx={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
      })}
    >
      <BottomNavigation showLabels value={current?.id ?? false}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === current?.id;
          return (
            <BottomNavigationAction
              key={item.id}
              value={item.id}
              component={NavLink}
              to={item.path}
              label={navLabels[item.id]}
              icon={
                <Icon
                  size={22}
                  weight={selected ? 'fill' : 'regular'}
                  aria-hidden="true"
                />
              }
              sx={(theme) => ({
                minWidth: 0,
                px: 0.5,
                // Cada item do tamanho do próprio rótulo: com a largura
                // dividida por igual, "Medicamentos" passaria do item em
                // 375 px e encostaria no vizinho.
                flex: '1 1 auto',
                // O selecionado fica na fonte dos outros, marcado pela cor e
                // pelo ícone preenchido; maior, ele não caberia no item.
                [`& .${actionClasses.label}.${actionClasses.selected}`]: {
                  fontSize: theme.typography.pxToRem(12),
                },
              })}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}

import {
  Alert,
  Badge,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import { Bell } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { alertPath } from '../constants/routes.js';
import { notificationBellContent as content } from '../data/alertPages.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { useResource } from '../hooks/useResource.js';
import { useSubmit } from '../hooks/useSubmit.js';
import {
  listNotifications,
  readAllNotifications,
  readNotification,
} from '../services/notificationService.js';
import { formatDateTime } from '../utils/format.js';
import ResourceState from './ResourceState.jsx';

// A caixa mostra as mais recentes; a lista completa dos alertas é a tela de
// alertas.
const BOX_LIMIT = 10;
const loadBox = () => listNotifications({ limit: BOX_LIMIT });

function NotificationBox({ onOpenAlert }) {
  const { unread, refresh } = useNotifications();
  const box = useResource(loadBox);
  const markAll = useSubmit(readAllNotifications);
  const [error, setError] = useState(null);

  async function readAll() {
    const outcome = await markAll.submit();
    if (outcome.error) {
      setError(content.readAllFailed);
      return;
    }
    setError(null);
    refresh();
    box.retry();
  }

  return (
    <Box sx={{ width: 360, maxWidth: 'calc(100vw - 32px)' }}>
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h3" component="h2">
          {content.title}
        </Typography>
        <Button
          size="small"
          onClick={readAll}
          disabled={unread === 0}
          loading={markAll.status === 'submitting'}
        >
          {content.readAll}
        </Button>
      </Stack>
      {error ? (
        <Alert severity="error" sx={{ m: 1.5 }}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ p: 1.5 }}>
        <ResourceState resource={box} emptyText={content.empty}>
          {(notifications) => (
            <List aria-label={content.listLabel} disablePadding>
              {notifications.map((notification) => (
                <ListItemButton
                  key={notification.id}
                  onClick={() => onOpenAlert(notification)}
                  sx={{ borderRadius: 1, alignItems: 'flex-start', gap: 1 }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      mt: 0.75,
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      borderRadius: '50%',
                      bgcolor: notification.readAt
                        ? 'transparent'
                        : 'primary.main',
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: notification.readAt ? 400 : 700,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {notification.alert.title}
                      {notification.readAt ? null : (
                        <Box component="span" sx={visuallyHidden}>
                          {` (${content.unread})`}
                        </Box>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {content.line(
                        notification.alert.patient.name,
                        formatDateTime(notification.createdAt),
                      )}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </ResourceState>
      </Box>
    </Box>
  );
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/**
 * Sino da barra superior (FE-35): o número de notificações não lidas do
 * próprio usuário e a caixa com as mais recentes. Abrir uma notificação a
 * marca como lida e leva ao detalhe do alerta; a leitura é só de quem está
 * na sessão e não resolve o alerta.
 */
export default function NotificationBell() {
  const { unread, refresh } = useNotifications();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  const openAlert = useCallback(
    async (notification) => {
      setAnchor(null);
      if (!notification.readAt) {
        // Falhar a leitura não impede de ver o alerta; a notificação só
        // continua não lida.
        await readNotification(notification.id).catch(() => null);
        refresh();
      }
      navigate(alertPath(notification.alert.id));
    },
    [navigate, refresh],
  );

  return (
    <>
      <IconButton
        aria-label={content.open(unread)}
        aria-haspopup="dialog"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <Badge badgeContent={unread} color="error" max={99}>
          <Bell size={22} aria-hidden="true" />
        </Badge>
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': content.title } }}
      >
        <NotificationBox onOpenAlert={openAlert} />
      </Popover>
    </>
  );
}

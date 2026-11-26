import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { PERMISSIONS as P } from '../constants/permissions.js';
import { NotificationsContext } from '../hooks/useNotifications.js';
import { useSession } from '../hooks/useSession.js';
import { countUnreadNotifications } from '../services/notificationService.js';

/**
 * Contador do sino das telas autenticadas (FE-35). É pedido ao abrir a
 * aplicação, a cada navegação e depois de cada leitura; quem não lê alertas
 * (`alerts:read`) não pede nada. Sem consulta repetida por intervalo.
 */
export default function NotificationsProvider({ children }) {
  const { can } = useSession();
  const { key } = useLocation();
  const allowed = can(P.ALERTS_READ);
  const [unread, setUnread] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!allowed) {
      return undefined;
    }
    let active = true;
    // Falhar a contagem mantém o último número: o sino é um atalho, e a tela
    // aberta não precisa mostrar o erro dele.
    countUnreadNotifications().then(
      ({ data }) => {
        if (active) {
          setUnread(data.unread);
        }
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [allowed, key, attempt]);

  const refresh = useCallback(() => setAttempt((count) => count + 1), []);
  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

import { createContext, useContext } from 'react';

/**
 * Contador de notificações não lidas do sino (`unread`) e `refresh()`, que o
 * pede de novo depois de uma leitura. Fora do `NotificationsProvider`, como
 * numa tela testada sozinha, o contador é zero e `refresh` não faz nada.
 */
export const NotificationsContext = createContext({
  unread: 0,
  refresh: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

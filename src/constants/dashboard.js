// Atalhos de período do painel: "Hoje" é o "Registros hoje" da Figura 33, e
// 30 dias é o padrão da API.
export const PERIOD_SHORTCUTS = Object.freeze(['today', '7', '30', '90']);
export const DEFAULT_SHORTCUT = '30';

// Indicadores do painel, na ordem dos cartões; cada um tem rota de detalhe
// na API (UC05, passo 4).
export const DASHBOARD_INDICATORS = Object.freeze([
  'patients',
  'alerts',
  'followUps',
  'users',
]);

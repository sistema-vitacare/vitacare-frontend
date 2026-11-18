// Recursos dos planos do Quadro 2 do TCC, com os códigos da API
// (`plan.types.ts`), na ordem do catálogo.
export const PLAN_FEATURES = Object.freeze([
  'patient_management',
  'health_records',
  'patient_history',
  'automatic_alerts',
  'responsive_access',
  'extended_registration',
  'management_reports',
  'operational_dashboard',
  'custom_deployment',
]);

// Só este recurso é conferido por rota na API: sem ele, o painel responde 403.
export const DASHBOARD_FEATURE = 'operational_dashboard';
export const MANAGEMENT_REPORTS_FEATURE = 'management_reports';

// Aviso de vencimento da vigência (BE-28): sete dias antes, um dia antes e
// vencido.
export const EXPIRY_WARNINGS = Object.freeze([
  'within_7_days',
  'within_1_day',
  'expired',
]);

// Situações de uma solicitação de mudança de plano.
export const CHANGE_REQUEST_STATUSES = Object.freeze([
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

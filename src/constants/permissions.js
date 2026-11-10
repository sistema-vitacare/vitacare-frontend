// Réplica de `src/modules/Access/access.permissions.ts` do vitacare-backend,
// que é a fonte oficial. A API não tem rota que devolva as permissões do
// usuário autenticado; até ter, uma mudança na matriz do backend precisa ser
// repetida aqui.

export const PERMISSIONS = Object.freeze({
  PATIENTS_READ: 'patients:read',
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_UPDATE: 'patients:update',
  PATIENTS_DEACTIVATE: 'patients:deactivate',
  PATIENT_HISTORY_READ: 'patient_history:read',
  PATIENT_EVOLUTION_READ: 'patient_evolution:read',
  ALERTS_READ: 'alerts:read',
  ALERTS_RESOLVE: 'alerts:resolve',
  FORMS_READ: 'forms:read',
  FORMS_CREATE: 'forms:create',
  FORMS_UPDATE: 'forms:update',
  FORMS_DEACTIVATE: 'forms:deactivate',
  ALERT_RULES_MANAGE: 'alert_rules:manage',
  FOLLOW_UPS_CREATE: 'follow_ups:create',
  FOLLOW_UPS_ANNUL: 'follow_ups:annul',
  MEDICATIONS_READ: 'medications:read',
  MEDICATIONS_CREATE: 'medications:create',
  MEDICATIONS_UPDATE: 'medications:update',
  MEDICATIONS_DEACTIVATE: 'medications:deactivate',
  REPORTS_GENERATE: 'reports:generate',
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_UPDATE: 'organization:update',
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_CHANGE_STATUS: 'users:change_status',
  USERS_CHANGE_PROFILE: 'users:change_profile',
  USERS_RESET_PASSWORD: 'users:reset_password',
  ACCESS_PROFILES_READ: 'access_profiles:read',
  PATIENT_LINKS_MANAGE: 'patient_links:manage',
  PLAN_READ: 'plan:read',
  PLAN_CHANGE_REQUESTS_CREATE: 'plan_change_requests:create',
  DASHBOARD_READ: 'dashboard:read',
  AUDIT_EVENTS_READ: 'audit_events:read',
  AUDIT_EVENTS_EXPORT: 'audit_events:export',
  PLATFORM_ORGANIZATIONS_CREATE: 'platform_organizations:create',
  PLATFORM_ORGANIZATIONS_READ: 'platform_organizations:read',
  PLATFORM_ORGANIZATIONS_UPDATE: 'platform_organizations:update',
  PLATFORM_ORGANIZATIONS_CHANGE_STATUS: 'platform_organizations:change_status',
});

const P = PERMISSIONS;

const FAMILY = [
  P.PATIENTS_READ,
  P.PATIENT_HISTORY_READ,
  P.PATIENT_EVOLUTION_READ,
  P.ALERTS_READ,
  P.MEDICATIONS_READ,
];

const CAREGIVER = [
  P.PATIENTS_READ,
  P.PATIENT_HISTORY_READ,
  P.ALERTS_READ,
  P.ALERTS_RESOLVE,
  P.FORMS_READ,
  P.FOLLOW_UPS_CREATE,
  P.MEDICATIONS_READ,
];

const PROFESSIONAL = [
  P.PATIENTS_READ,
  P.PATIENTS_CREATE,
  P.PATIENTS_UPDATE,
  P.PATIENTS_DEACTIVATE,
  P.PATIENT_HISTORY_READ,
  P.PATIENT_EVOLUTION_READ,
  P.ALERTS_READ,
  P.ALERTS_RESOLVE,
  P.FORMS_READ,
  P.FORMS_CREATE,
  P.FORMS_UPDATE,
  P.FORMS_DEACTIVATE,
  P.ALERT_RULES_MANAGE,
  P.FOLLOW_UPS_ANNUL,
  P.MEDICATIONS_READ,
  P.MEDICATIONS_CREATE,
  P.MEDICATIONS_UPDATE,
  P.MEDICATIONS_DEACTIVATE,
  P.REPORTS_GENERATE,
  P.PATIENT_LINKS_MANAGE,
];

const ADMINISTRATIVE = [
  P.ORGANIZATION_READ,
  P.ORGANIZATION_UPDATE,
  P.USERS_READ,
  P.USERS_CREATE,
  P.USERS_UPDATE,
  P.USERS_CHANGE_STATUS,
  P.USERS_CHANGE_PROFILE,
  P.USERS_RESET_PASSWORD,
  P.ACCESS_PROFILES_READ,
  P.PLAN_READ,
  P.PLAN_CHANGE_REQUESTS_CREATE,
  P.DASHBOARD_READ,
  P.AUDIT_EVENTS_READ,
  P.AUDIT_EVENTS_EXPORT,
];

const PLATFORM_ADMIN = [
  P.USERS_RESET_PASSWORD,
  P.ORGANIZATION_READ,
  P.ORGANIZATION_UPDATE,
  P.PLATFORM_ORGANIZATIONS_CREATE,
  P.PLATFORM_ORGANIZATIONS_READ,
  P.PLATFORM_ORGANIZATIONS_UPDATE,
  P.PLATFORM_ORGANIZATIONS_CHANGE_STATUS,
  P.AUDIT_EVENTS_READ,
  P.AUDIT_EVENTS_EXPORT,
];

// O administrador herda o profissional de saúde, mas não o cuidador: só o
// cuidador registra acompanhamento (decisão do backend, Figura 28 do TCC).
export const PROFILE_PERMISSIONS = Object.freeze({
  platform_admin: PLATFORM_ADMIN,
  admin: [...PROFESSIONAL, ...ADMINISTRATIVE],
  professional: PROFESSIONAL,
  caregiver: CAREGIVER,
  family: FAMILY,
});

export function permissionsFor(profileCode) {
  return PROFILE_PERMISSIONS[profileCode] ?? [];
}

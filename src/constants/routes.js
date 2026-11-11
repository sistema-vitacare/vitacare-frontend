import {
  Buildings,
  ChartLineUp,
  ClipboardText,
  GearSix,
  ListChecks,
  Pill,
  ShieldCheck,
  SquaresFour,
  Users,
  UsersThree,
  WarningOctagon,
} from '@phosphor-icons/react';
import { PERMISSIONS as P } from './permissions.js';

export const PATHS = Object.freeze({
  LOGIN: '/login',
  PASSWORD_RECOVERY: '/recuperar-senha',
  PASSWORD_RESET: '/redefinir-senha',
  FIRST_ACCESS: '/primeiro-acesso',
  HOME: '/',
  DASHBOARD: '/painel',
  PATIENTS: '/pacientes',
  PATIENT_NEW: '/pacientes/novo',
  PATIENT_DETAIL: '/pacientes/:patientId',
  PATIENT_EDIT: '/pacientes/:patientId/editar',
  PATIENT_HISTORY: '/pacientes/:patientId/historico',
  RECORDS: '/registros',
  MEDICATIONS: '/medicamentos',
  ALERTS: '/alertas',
  FORMS: '/formularios',
  REPORTS: '/relatorios',
  USERS: '/usuarios',
  AUDIT: '/auditoria',
  SETTINGS: '/configuracoes',
  ORGANIZATIONS: '/organizacoes',
});

/** Ordem dos grupos no menu. */
export const NAV_GROUPS = Object.freeze(['care', 'platform', 'management']);

/**
 * Uma entrada por tela do menu, na ordem em que aparecem. A permissão é a
 * mesma que a API exige para ler os dados da tela: um item sem ela levaria
 * a uma página de acesso negado.
 */
export const NAV_ITEMS = Object.freeze([
  {
    id: 'dashboard',
    path: PATHS.DASHBOARD,
    permission: P.DASHBOARD_READ,
    group: 'care',
    icon: SquaresFour,
  },
  {
    id: 'patients',
    path: PATHS.PATIENTS,
    permission: P.PATIENTS_READ,
    group: 'care',
    icon: UsersThree,
  },
  {
    id: 'records',
    path: PATHS.RECORDS,
    permission: P.PATIENT_HISTORY_READ,
    group: 'care',
    icon: ClipboardText,
  },
  {
    id: 'medications',
    path: PATHS.MEDICATIONS,
    permission: P.MEDICATIONS_READ,
    group: 'care',
    icon: Pill,
  },
  {
    id: 'alerts',
    path: PATHS.ALERTS,
    permission: P.ALERTS_READ,
    group: 'care',
    icon: WarningOctagon,
  },
  {
    id: 'organizations',
    path: PATHS.ORGANIZATIONS,
    permission: P.PLATFORM_ORGANIZATIONS_READ,
    group: 'platform',
    icon: Buildings,
  },
  {
    id: 'forms',
    path: PATHS.FORMS,
    permission: P.FORMS_READ,
    group: 'management',
    icon: ListChecks,
  },
  {
    id: 'reports',
    path: PATHS.REPORTS,
    permission: P.REPORTS_GENERATE,
    group: 'management',
    icon: ChartLineUp,
  },
  {
    id: 'users',
    path: PATHS.USERS,
    permission: P.USERS_READ,
    group: 'management',
    icon: Users,
  },
  {
    id: 'audit',
    path: PATHS.AUDIT,
    permission: P.AUDIT_EVENTS_READ,
    group: 'management',
    icon: ShieldCheck,
  },
  {
    id: 'settings',
    path: PATHS.SETTINGS,
    permission: P.ORGANIZATION_READ,
    group: 'management',
    icon: GearSix,
  },
]);

// Ordem de preferência da página inicial. A escolha é por permissão, e não
// pelo nome do perfil, para que uma mudança na matriz não exija mexer aqui.
const HOME_ORDER = ['dashboard', 'organizations', 'patients'];

/** Itens do menu que a sessão pode abrir, na ordem do menu. */
export function visibleNavItems(can) {
  return NAV_ITEMS.filter((item) => can(item.permission));
}

/** Endereço da página inicial da sessão, ou `null` se nenhuma é permitida. */
export function homePath(can) {
  const item = HOME_ORDER.map((id) =>
    NAV_ITEMS.find((entry) => entry.id === id),
  ).find((entry) => can(entry.permission));
  return item ? item.path : null;
}

/**
 * Quem registra visita usa o celular na mão, durante o atendimento, e
 * navega pela barra inferior em vez do menu recolhível.
 */
export function usesBottomNav(can) {
  return can(P.FOLLOW_UPS_CREATE);
}

const PATIENT_SUBPAGES = Object.freeze({
  edit: 'editar',
  history: 'historico',
});

/**
 * Endereço de uma página do paciente: detalhe (sem `page`), `edit` ou
 * `history`. O id é codificado porque vem da API, e não do código.
 */
export function patientPath(patientId, page) {
  const base = `${PATHS.PATIENTS}/${encodeURIComponent(patientId)}`;
  return page ? `${base}/${PATIENT_SUBPAGES[page]}` : base;
}

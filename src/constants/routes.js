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
  DASHBOARD_INDICATOR: '/painel/:indicator',
  PATIENTS: '/pacientes',
  PATIENT_NEW: '/pacientes/novo',
  PATIENT_DETAIL: '/pacientes/:patientId',
  PATIENT_EDIT: '/pacientes/:patientId/editar',
  PATIENT_HISTORY: '/pacientes/:patientId/historico',
  PATIENT_VISIT: '/pacientes/:patientId/registrar',
  RECORDS: '/registros',
  RECORD_DETAIL: '/registros/:followUpId',
  MEDICATIONS: '/medicamentos',
  ALERTS: '/alertas',
  ALERT_DETAIL: '/alertas/:alertId',
  FORMS: '/formularios',
  FORM_NEW: '/formularios/novo',
  FORM_DETAIL: '/formularios/:formId',
  REPORTS: '/relatorios',
  USERS: '/usuarios',
  USER_DETAIL: '/usuarios/:userId',
  AUDIT: '/auditoria',
  AUDIT_EVENT: '/auditoria/:eventId',
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
  visit: 'registrar',
});

/**
 * Endereço de uma página do paciente: detalhe (sem `page`), `edit`,
 * `history` ou `visit`. O id é codificado porque vem da API, e não do
 * código.
 */
export function patientPath(patientId, page) {
  const base = `${PATHS.PATIENTS}/${encodeURIComponent(patientId)}`;
  return page ? `${base}/${PATIENT_SUBPAGES[page]}` : base;
}

/** Página do formulário; o id vem da API e é codificado. */
export function formPath(formId) {
  return `${PATHS.FORMS}/${encodeURIComponent(formId)}`;
}

/** Detalhe do registro de acompanhamento; o id vem da API e é codificado. */
export function recordPath(followUpId) {
  return `${PATHS.RECORDS}/${encodeURIComponent(followUpId)}`;
}

/** Detalhe do alerta; o id vem da API e é codificado. */
export function alertPath(alertId) {
  return `${PATHS.ALERTS}/${encodeURIComponent(alertId)}`;
}

// Paciente das listas que a API só devolve por paciente (registros,
// medicamentos e alertas), no endereço: o "voltar" do navegador e os links
// das outras telas trazem a lista dele de volta.
export const PATIENT_PARAM = 'paciente';

function withPatient(path, patientId) {
  if (!patientId) {
    return path;
  }
  return `${path}?${new URLSearchParams([[PATIENT_PARAM, patientId]])}`;
}

/** Lista de registros, já com o paciente escolhido quando há um. */
export function recordsPath(patientId) {
  return withPatient(PATHS.RECORDS, patientId);
}

/** Medicamentos, já com o paciente escolhido quando há um. */
export function medicationsPath(patientId) {
  return withPatient(PATHS.MEDICATIONS, patientId);
}

/** Alertas, já com o paciente escolhido quando há um. */
export function alertsPath(patientId) {
  return withPatient(PATHS.ALERTS, patientId);
}

/** Relatórios, já com o paciente escolhido quando há um. */
export function reportsPath(patientId) {
  return withPatient(PATHS.REPORTS, patientId);
}

/** Página do usuário; o id vem da API e é codificado. */
export function userPath(userId) {
  return `${PATHS.USERS}/${encodeURIComponent(userId)}`;
}

/** Detalhe do evento de auditoria; o id vem da API e é codificado. */
export function auditEventPath(eventId) {
  return `${PATHS.AUDIT}/${encodeURIComponent(eventId)}`;
}

// Atalho de período do painel no endereço, para que o detalhe de um
// indicador e a volta ao painel mantenham o mesmo período.
export const PERIOD_PARAM = 'periodo';

// Trecho do endereço de cada indicador, em português como o resto das rotas.
const INDICATOR_SLUGS = Object.freeze({
  patients: 'pacientes',
  users: 'usuarios',
  followUps: 'registros',
  alerts: 'alertas',
});

function withPeriod(path, period) {
  if (!period) {
    return path;
  }
  return `${path}?${new URLSearchParams([[PERIOD_PARAM, period]])}`;
}

/** Painel, com o atalho de período quando há um. */
export function dashboardPath(period) {
  return withPeriod(PATHS.DASHBOARD, period);
}

/** Detalhe de um indicador do painel (UC05, passo 4), com o período. */
export function dashboardIndicatorPath(indicator, period) {
  return withPeriod(`${PATHS.DASHBOARD}/${INDICATOR_SLUGS[indicator]}`, period);
}

/** Indicador do trecho do endereço; `null` quando ele não existe. */
export function indicatorFromSlug(slug) {
  const entry = Object.entries(INDICATOR_SLUGS).find(
    ([, value]) => value === slug,
  );
  return entry ? entry[0] : null;
}

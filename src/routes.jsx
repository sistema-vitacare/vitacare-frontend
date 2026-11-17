import { Suspense } from 'react';
import { Outlet } from 'react-router';
import AppShell from './components/AppShell.jsx';
import HomeRedirect from './components/HomeRedirect.jsx';
import RequirePermission from './components/RequirePermission.jsx';
import RequireSession from './components/RequireSession.jsx';
import { LoadingBar } from './components/ResourceState.jsx';
import { PERMISSIONS as P } from './constants/permissions.js';
import { NAV_ITEMS, PATHS } from './constants/routes.js';
import { navLabels } from './data/navigation.js';
import {
  AlertDetailPage,
  AlertListPage,
  AuditEventPage,
  AuditListPage,
  DashboardIndicatorPage,
  DashboardPage,
  FirstAccessPage,
  FollowUpDetailPage,
  FollowUpListPage,
  FormListPage,
  FormPage,
  LoginPage,
  MedicationListPage,
  OrganizationDetailPage,
  OrganizationListPage,
  OrganizationNewPage,
  PasswordRecoveryPage,
  PasswordResetPage,
  PatientDetailPage,
  PatientFormPage,
  PatientHistoryPage,
  PatientListPage,
  ReportsPage,
  SettingsPage,
  UserDetailPage,
  UserListPage,
  VisitPage,
} from './lazyPages.js';
import StatusPage from './pages/Status/StatusPage.jsx';

// Barra mostrada enquanto o arquivo da tela chega. O roteador troca de tela
// em transição, mantendo a anterior; por isso a barra só aparece quando a área
// é montada: na primeira carga e ao entrar ou sair do layout autenticado. Uma
// fica abaixo do layout, para o menu continuar na tela, e outra na raiz, para
// as telas de acesso.
const pageSuspense = (
  <Suspense fallback={<LoadingBar />}>
    <Outlet />
  </Suspense>
);

// Página de cada item do menu. Item sem página ainda mostra "em construção"
// com o nome da tela; cada tela nova entra aqui.
const screens = {
  dashboard: <DashboardPage />,
  patients: <PatientListPage />,
  records: <FollowUpListPage />,
  medications: <MedicationListPage />,
  alerts: <AlertListPage />,
  forms: <FormListPage />,
  reports: <ReportsPage />,
  users: <UserListPage />,
  audit: <AuditListPage />,
  settings: <SettingsPage />,
  organizations: <OrganizationListPage />,
};

// Telas abaixo de um item do menu, cada uma com a permissão que a API exige
// para a ação dela. O cadastro (`/pacientes/novo`) vence o detalhe
// (`/pacientes/:patientId`) porque o roteador prefere o trecho fixo; o
// mesmo vale para `/formularios/novo` e `/organizacoes/nova`.
const subpages = [
  {
    path: PATHS.DASHBOARD_INDICATOR,
    permission: P.DASHBOARD_READ,
    element: <DashboardIndicatorPage />,
  },
  {
    path: PATHS.USER_DETAIL,
    permission: P.USERS_READ,
    element: <UserDetailPage />,
  },
  {
    path: PATHS.AUDIT_EVENT,
    permission: P.AUDIT_EVENTS_READ,
    element: <AuditEventPage />,
  },
  {
    path: PATHS.ORGANIZATION_NEW,
    permission: P.PLATFORM_ORGANIZATIONS_CREATE,
    element: <OrganizationNewPage />,
  },
  {
    path: PATHS.ORGANIZATION_DETAIL,
    permission: P.PLATFORM_ORGANIZATIONS_READ,
    element: <OrganizationDetailPage />,
  },
  {
    path: PATHS.PATIENT_NEW,
    permission: P.PATIENTS_CREATE,
    element: <PatientFormPage />,
  },
  {
    path: PATHS.PATIENT_DETAIL,
    permission: P.PATIENTS_READ,
    element: <PatientDetailPage />,
  },
  {
    path: PATHS.PATIENT_EDIT,
    permission: P.PATIENTS_UPDATE,
    element: <PatientFormPage />,
  },
  {
    path: PATHS.PATIENT_HISTORY,
    permission: P.PATIENT_HISTORY_READ,
    element: <PatientHistoryPage />,
  },
  {
    path: PATHS.PATIENT_VISIT,
    permission: P.FOLLOW_UPS_CREATE,
    element: <VisitPage />,
  },
  {
    path: PATHS.RECORD_DETAIL,
    permission: P.PATIENT_HISTORY_READ,
    element: <FollowUpDetailPage />,
  },
  {
    path: PATHS.ALERT_DETAIL,
    permission: P.ALERTS_READ,
    element: <AlertDetailPage />,
  },
  {
    path: PATHS.FORM_NEW,
    permission: P.FORMS_CREATE,
    element: <FormPage />,
  },
  {
    path: PATHS.FORM_DETAIL,
    permission: P.FORMS_READ,
    element: <FormPage />,
  },
];

function protect(permission, element) {
  return (
    <RequirePermission
      permission={permission}
      fallback={<StatusPage kind="accessDenied" />}
    >
      {element}
    </RequirePermission>
  );
}

function screenFor(item) {
  return (
    screens[item.id] ?? (
      <StatusPage kind="underConstruction" title={navLabels[item.id]} />
    )
  );
}

export const appRoutes = [
  {
    // Erro de renderização em qualquer rota cai aqui, fora do layout, que
    // pode ser justamente o que falhou.
    errorElement: <StatusPage kind="error" />,
    element: pageSuspense,
    children: [
      // Fora do `RequireSession`: quem esqueceu a senha não tem sessão, e o
      // primeiro acesso usa a sessão restrita, que a própria tela confere.
      { path: PATHS.LOGIN, element: <LoginPage /> },
      { path: PATHS.PASSWORD_RECOVERY, element: <PasswordRecoveryPage /> },
      { path: PATHS.PASSWORD_RESET, element: <PasswordResetPage /> },
      { path: PATHS.FIRST_ACCESS, element: <FirstAccessPage /> },
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                element: pageSuspense,
                children: [
                  {
                    index: true,
                    element: (
                      <HomeRedirect
                        fallback={<StatusPage kind="accessDenied" />}
                      />
                    ),
                  },
                  ...NAV_ITEMS.map((item) => ({
                    path: item.path,
                    element: protect(item.permission, screenFor(item)),
                  })),
                  ...subpages.map((page) => ({
                    path: page.path,
                    element: protect(page.permission, page.element),
                  })),
                  { path: '*', element: <StatusPage kind="notFound" /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

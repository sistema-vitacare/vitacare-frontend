import AppShell from './components/AppShell.jsx';
import HomeRedirect from './components/HomeRedirect.jsx';
import RequirePermission from './components/RequirePermission.jsx';
import RequireSession from './components/RequireSession.jsx';
import { PERMISSIONS as P } from './constants/permissions.js';
import { NAV_ITEMS, PATHS } from './constants/routes.js';
import { navLabels } from './data/navigation.js';
import AlertDetailPage from './pages/Alerts/AlertDetailPage.jsx';
import AlertListPage from './pages/Alerts/AlertListPage.jsx';
import FirstAccessPage from './pages/FirstAccess/FirstAccessPage.jsx';
import FollowUpDetailPage from './pages/FollowUps/FollowUpDetailPage.jsx';
import FollowUpListPage from './pages/FollowUps/FollowUpListPage.jsx';
import VisitPage from './pages/FollowUps/VisitPage.jsx';
import FormListPage from './pages/Forms/FormListPage.jsx';
import FormPage from './pages/Forms/FormPage.jsx';
import LoginPage from './pages/Login/LoginPage.jsx';
import MedicationListPage from './pages/Medications/MedicationListPage.jsx';
import PasswordRecoveryPage from './pages/PasswordRecovery/PasswordRecoveryPage.jsx';
import PasswordResetPage from './pages/PasswordReset/PasswordResetPage.jsx';
import PatientDetailPage from './pages/Patients/PatientDetailPage.jsx';
import PatientFormPage from './pages/Patients/PatientFormPage.jsx';
import PatientHistoryPage from './pages/Patients/PatientHistoryPage.jsx';
import PatientListPage from './pages/Patients/PatientListPage.jsx';
import StatusPage from './pages/Status/StatusPage.jsx';

// Página de cada item do menu. Item sem página ainda mostra "em construção"
// com o nome da tela; cada tela nova entra aqui.
const screens = {
  patients: <PatientListPage />,
  records: <FollowUpListPage />,
  medications: <MedicationListPage />,
  alerts: <AlertListPage />,
  forms: <FormListPage />,
};

// Telas abaixo de um item do menu, cada uma com a permissão que a API exige
// para a ação dela. O cadastro (`/pacientes/novo`) vence o detalhe
// (`/pacientes/:patientId`) porque o roteador prefere o trecho fixo; o
// mesmo vale para `/formularios/novo`.
const subpages = [
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
                index: true,
                element: (
                  <HomeRedirect fallback={<StatusPage kind="accessDenied" />} />
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
];

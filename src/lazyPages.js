import { lazy } from 'react';

// As telas do roteador, cada uma num arquivo à parte do build, baixado na
// primeira vez que a tela é aberta; assim, a primeira carga não traz o
// código de todas. A `StatusPage` fica de fora, importada direto pelo
// roteador, porque é a tela de erro quando o arquivo de outra tela não
// carrega.
export const AlertDetailPage = lazy(
  () => import('./pages/Alerts/AlertDetailPage.jsx'),
);
export const AlertListPage = lazy(
  () => import('./pages/Alerts/AlertListPage.jsx'),
);
export const AuditEventPage = lazy(
  () => import('./pages/Audit/AuditEventPage.jsx'),
);
export const AuditListPage = lazy(
  () => import('./pages/Audit/AuditListPage.jsx'),
);
export const DashboardIndicatorPage = lazy(
  () => import('./pages/Dashboard/DashboardIndicatorPage.jsx'),
);
export const DashboardPage = lazy(
  () => import('./pages/Dashboard/DashboardPage.jsx'),
);
export const FirstAccessPage = lazy(
  () => import('./pages/FirstAccess/FirstAccessPage.jsx'),
);
export const FollowUpDetailPage = lazy(
  () => import('./pages/FollowUps/FollowUpDetailPage.jsx'),
);
export const FollowUpListPage = lazy(
  () => import('./pages/FollowUps/FollowUpListPage.jsx'),
);
export const FormListPage = lazy(
  () => import('./pages/Forms/FormListPage.jsx'),
);
export const FormPage = lazy(() => import('./pages/Forms/FormPage.jsx'));
export const InvitationAcceptPage = lazy(
  () => import('./pages/InvitationAccept/InvitationAcceptPage.jsx'),
);
export const LoginPage = lazy(() => import('./pages/Login/LoginPage.jsx'));
export const MedicationListPage = lazy(
  () => import('./pages/Medications/MedicationListPage.jsx'),
);
export const OrganizationDetailPage = lazy(
  () => import('./pages/Organizations/OrganizationDetailPage.jsx'),
);
export const OrganizationListPage = lazy(
  () => import('./pages/Organizations/OrganizationListPage.jsx'),
);
export const OrganizationNewPage = lazy(
  () => import('./pages/Organizations/OrganizationNewPage.jsx'),
);
export const PasswordRecoveryPage = lazy(
  () => import('./pages/PasswordRecovery/PasswordRecoveryPage.jsx'),
);
export const PasswordResetPage = lazy(
  () => import('./pages/PasswordReset/PasswordResetPage.jsx'),
);
export const PatientDetailPage = lazy(
  () => import('./pages/Patients/PatientDetailPage.jsx'),
);
export const PatientFormPage = lazy(
  () => import('./pages/Patients/PatientFormPage.jsx'),
);
export const PatientHistoryPage = lazy(
  () => import('./pages/Patients/PatientHistoryPage.jsx'),
);
export const PatientListPage = lazy(
  () => import('./pages/Patients/PatientListPage.jsx'),
);
export const ReportsPage = lazy(
  () => import('./pages/Reports/ReportsPage.jsx'),
);
export const SettingsPage = lazy(
  () => import('./pages/Settings/SettingsPage.jsx'),
);
export const TermsPage = lazy(() => import('./pages/Terms/TermsPage.jsx'));
export const UserDetailPage = lazy(
  () => import('./pages/Users/UserDetailPage.jsx'),
);
export const UserListPage = lazy(
  () => import('./pages/Users/UserListPage.jsx'),
);
export const VisitPage = lazy(() => import('./pages/FollowUps/VisitPage.jsx'));

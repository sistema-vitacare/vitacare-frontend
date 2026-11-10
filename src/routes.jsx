import AppShell from './components/AppShell.jsx';
import HomeRedirect from './components/HomeRedirect.jsx';
import RequirePermission from './components/RequirePermission.jsx';
import RequireSession from './components/RequireSession.jsx';
import { NAV_ITEMS, PATHS } from './constants/routes.js';
import { navLabels } from './data/navigation.js';
import FirstAccessPage from './pages/FirstAccess/FirstAccessPage.jsx';
import LoginPage from './pages/Login/LoginPage.jsx';
import PasswordRecoveryPage from './pages/PasswordRecovery/PasswordRecoveryPage.jsx';
import PasswordResetPage from './pages/PasswordReset/PasswordResetPage.jsx';
import StatusPage from './pages/Status/StatusPage.jsx';

// Página de cada item do menu. Item sem página ainda mostra "em construção"
// com o nome da tela; cada tela nova entra aqui.
const screens = {};

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
                element: (
                  <RequirePermission
                    permission={item.permission}
                    fallback={<StatusPage kind="accessDenied" />}
                  >
                    {screenFor(item)}
                  </RequirePermission>
                ),
              })),
              { path: '*', element: <StatusPage kind="notFound" /> },
            ],
          },
        ],
      },
    ],
  },
];

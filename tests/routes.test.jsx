import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SessionProvider from '../src/components/SessionProvider.jsx';
import {
  PATHS,
  alertPath,
  auditEventPath,
  dashboardIndicatorPath,
  formPath,
  medicationsPath,
  organizationPath,
  patientPath,
  recordPath,
  userPath,
} from '../src/constants/routes.js';
import { accessFields, changePasswordContent } from '../src/data/access.js';
import { auditListContent } from '../src/data/auditPages.js';
import { organizationSectionContent } from '../src/data/settingsPages.js';
import { alertDetailContent } from '../src/data/alertPages.js';
import { dashboardIndicatorContent } from '../src/data/dashboardPages.js';
import { medicationListContent } from '../src/data/medicationPages.js';
import { firstAccessContent } from '../src/data/firstAccess.js';
import { followUpDetailContent } from '../src/data/followUpPages.js';
import { formPageContent } from '../src/data/formPage.js';
import { loginContent } from '../src/data/login.js';
import { navLabels } from '../src/data/navigation.js';
import { organizationNewContent } from '../src/data/organizationPages.js';
import { patientDetailContent } from '../src/data/patientDetail.js';
import { patientFormContent } from '../src/data/patientForm.js';
import { patientHistoryContent } from '../src/data/patientHistory.js';
import { recoveryContent, resetContent } from '../src/data/passwordRecovery.js';
import { statusContent } from '../src/data/status.js';
import { visitRecordContent } from '../src/data/visitRecord.js';
import { reportsPageContent } from '../src/data/managementReports.js';
import { patientReportContent } from '../src/data/patientReport.js';
import { userListContent } from '../src/data/userPages.js';
import { appRoutes } from '../src/routes.jsx';
import lazyPagesSource from '../src/lazyPages.js?raw';
import routesSource from '../src/routes.jsx?raw';
import { resetMockState } from '../src/services/mockApi.js';
import { theme } from '../src/styles/theme.js';
import { preloadPages } from './support/preloadPages.js';
import { resetViewport, setViewportWidth } from './support/viewport.js';
import { apiStub } from './support/apiStub.js';
import { ABSENCE, alertRoutes } from './support/fixtures/alerts.js';
import { auditRoutes } from './support/fixtures/audit.js';
import { credentialsFor } from './support/fixtures/sessions.js';
import { followUpRoutes } from './support/fixtures/followUps.js';
import { formRoutes } from './support/fixtures/forms.js';
import { medicationRoutes } from './support/fixtures/medications.js';
import { apiPatient, patientRoutes } from './support/fixtures/patients.js';

await preloadPages();

const RAFAEL = 'f6b21c50-000b-5e70-878b-b5e7f5f9a410';
const HOUR = 60 * 60 * 1000;

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const BEM_VIVER = 'cecd71bf-0168-5d1b-bd8e-ca3083210067';
const PROFILE_CHANGED_EVENT = 'a0d17000-0000-5000-8000-000000000009';

function renderApp(path, routes = appRoutes) {
  setViewportWidth(1440);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ThemeProvider>,
  );
  return router;
}

function heading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

// Entra pelo formulário de login, com o usuário de demonstração do perfil,
// que o stub da API reconhece.
async function signInAs(profile) {
  if (profile === 'family') {
    // A familiar de demonstração alcança só a Dirce, e a API traz nela o
    // vínculo de quem consulta.
    apiStub().use(
      patientRoutes([
        apiPatient(DIRCE, {
          viewerLink: { role: 'family', linkType: 'Filha' },
        }),
      ]),
    );
  }
  await fillLogin(credentialsFor(profile));
}

async function signInWithForm(email) {
  await fillLogin({ ...credentialsFor('admin'), email });
}

async function fillLogin(values) {
  await heading(loginContent.title);
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(
      screen.getByLabelText(accessFields[name].label, { selector: 'input' }),
      { target: { value } },
    );
  }
  fireEvent.click(screen.getByRole('button', { name: loginContent.submit }));
}

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Pacientes, formulários, registros, medicamentos e alertas vêm da API pelo
// stub; só usuários e organizações continuam simulados (Bloco 14).
beforeEach(() => {
  apiStub().use({
    ...patientRoutes(),
    ...formRoutes(),
    ...followUpRoutes(),
    ...medicationRoutes(),
    ...alertRoutes(),
  });
});

describe('rotas', () => {
  it('leva ao login quem abre uma rota autenticada sem sessão', async () => {
    const router = renderApp(PATHS.PATIENTS);

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it.each([
    ['admin', PATHS.DASHBOARD, navLabels.dashboard],
    ['professional', PATHS.PATIENTS, navLabels.patients],
    ['caregiver', PATHS.PATIENTS, navLabels.patients],
    // A familiar com um único paciente vai direto ao acompanhamento dele.
    ['family', patientPath(DIRCE, 'history'), patientHistoryContent.title],
    ['platform_admin', PATHS.ORGANIZATIONS, navLabels.organizations],
  ])(
    'leva o perfil %s, depois do atalho, para a página inicial %s',
    async (profile, path, title) => {
      const router = renderApp(PATHS.LOGIN);

      await signInAs(profile);

      expect(await heading(title)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
    },
  );

  it('leva o endereço raiz para a página inicial do perfil', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate(PATHS.HOME));

    expect(router.state.location.pathname).toBe(PATHS.DASHBOARD);
  });

  it('leva quem já tem sessão do login para a página inicial', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.LOGIN));

    expect(router.state.location.pathname).toBe(PATHS.PATIENTS);
  });

  it('volta ao login com o aviso quando a sessão expira em 12 horas', async () => {
    // `shouldAdvanceTime` deixa o relógio simulado andar junto com o real,
    // para que as buscas assíncronas da Testing Library continuem funcionando.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
      shouldAdvanceTime: true,
    });
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    act(() => vi.advanceTimersByTime(12 * HOUR));

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(screen.getByText(loginContent.expired)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it('não mostra o aviso de sessão expirada a quem ainda não entrou', async () => {
    renderApp(PATHS.LOGIN);

    await heading(loginContent.title);

    expect(screen.queryByText(loginContent.expired)).not.toBeInTheDocument();
  });

  it('mostra acesso negado na rota sem permissão', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.USERS));

    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('não monta a tela da rota sem permissão', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.USERS));

    expect(
      screen.queryByRole('heading', { level: 1, name: navLabels.users }),
    ).not.toBeInTheDocument();
  });

  it('mostra página não encontrada para endereço inexistente', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate('/endereco-que-nao-existe'));

    expect(await heading(statusContent.notFound.title)).toBeInTheDocument();
  });

  it('mostra a página de erro quando uma tela falha ao renderizar', async () => {
    // O React registra no console o erro capturado; aqui ele é esperado.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenScreen() {
      throw new Error('falha simulada');
    }
    const [root] = appRoutes;
    const routes = [
      {
        ...root,
        children: [
          { path: '/tela-quebrada', element: <BrokenScreen /> },
          ...root.children,
        ],
      },
    ];

    renderApp('/tela-quebrada', routes);

    expect(await heading(statusContent.error.title)).toBeInTheDocument();
  });

  it('volta ao login pelo Sair', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    fireEvent.click(screen.getByRole('button', { name: /Helena Vasconcelos/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sair' }));

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(screen.queryByText(loginContent.expired)).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });

  it('leva ao painel quem entra pelo formulário de login', async () => {
    const router = renderApp(PATHS.LOGIN);

    await signInWithForm('helena.vasconcelos@ipeamarelo.example');

    expect(await heading(navLabels.dashboard)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.DASHBOARD);
  });

  it('abre a recuperação de senha pelo link do login, sem sessão', async () => {
    const router = renderApp(PATHS.LOGIN);
    await heading(loginContent.title);

    fireEvent.click(
      screen.getByRole('link', { name: loginContent.forgotPassword }),
    );

    expect(await heading(recoveryContent.title)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.PASSWORD_RECOVERY);
  });

  it('abre a redefinição de senha pelo endereço do link do e-mail, sem sessão', async () => {
    renderApp(`${PATHS.PASSWORD_RESET}?token=token-do-link`);

    expect(await heading(resetContent.title)).toBeInTheDocument();
  });

  it('prende a sessão restrita no primeiro acesso', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInWithForm('edna.pires@ipeamarelo.example');
    expect(await heading(firstAccessContent.title)).toBeInTheDocument();

    await act(() => router.navigate(PATHS.PATIENTS));

    expect(await heading(firstAccessContent.title)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.FIRST_ACCESS);
  });

  it('liga a lista de pacientes ao detalhe, ao cadastro e ao histórico', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    expect(await heading(navLabels.patients)).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole('link', { name: 'Dirce Albuquerque Moraes' }),
    );
    expect(await heading('Dirce Albuquerque Moraes')).toBeInTheDocument();

    await act(() => router.navigate(patientPath(DIRCE, 'history')));
    expect(await heading(patientHistoryContent.title)).toBeInTheDocument();

    await act(() => router.navigate(PATHS.PATIENT_NEW));
    expect(await heading(patientFormContent.newTitle)).toBeInTheDocument();
  });

  it('protege o cadastro de paciente pela permissão de cadastrar', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.PATIENT_NEW));

    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('liga os formulários à página do formulário e ao formulário novo', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.FORMS));
    expect(await heading(navLabels.forms)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('link', { name: 'Sinais vitais' }));
    expect(await heading('Sinais vitais')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      formPath('8c0342e9-d9e9-58c2-a229-1c32168a8bf2'),
    );

    await act(() => router.navigate(PATHS.FORM_NEW));
    expect(await heading(formPageContent.newTitle)).toBeInTheDocument();
  });

  it('protege o formulário novo pela permissão de criar e os formulários pela de ler', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(PATHS.FORM_NEW));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();

    await act(() => router.navigate(PATHS.FORMS));
    expect(await heading(navLabels.forms)).toBeInTheDocument();
  });

  it('abre o registro de visita para a cuidadora', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(patientPath(DIRCE, 'visit')));
    expect(await heading(visitRecordContent.title)).toBeInTheDocument();
  });

  it('nega o registro de visita a quem não registra', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);
    await act(() => router.navigate(patientPath(DIRCE, 'visit')));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('liga a lista de registros ao detalhe do registro', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('family');
    // A familiar de um paciente só entra direto no histórico dele.
    await heading(patientHistoryContent.title);

    await act(() => router.navigate(PATHS.RECORDS));
    expect(await heading(navLabels.records)).toBeInTheDocument();
    await act(() =>
      router.navigate(recordPath('f0110000-0000-5000-8000-000100000013')),
    );
    expect(await heading(followUpDetailContent.title)).toBeInTheDocument();
  });

  it('abre medicamentos e alertas pelo menu, com o paciente do endereço', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);

    await act(() => router.navigate(medicationsPath(DIRCE)));
    expect(await heading(navLabels.medications)).toBeInTheDocument();
    expect(
      await screen.findByText(medicationListContent.count(4)),
    ).toBeInTheDocument();

    await act(() => router.navigate(PATHS.ALERTS));
    expect(await heading(navLabels.alerts)).toBeInTheDocument();
  });

  it('abre o detalhe do alerta a quem lê alertas', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);

    await act(() => router.navigate(alertPath(ABSENCE)));
    expect(await heading('Ausência de registro')).toBeInTheDocument();

    await act(() => router.navigate(alertPath('nao-existe')));
    expect(await heading(alertDetailContent.notFound)).toBeInTheDocument();
  });

  it('nega o detalhe do alerta à plataforma', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('platform_admin');
    // A página inicial da plataforma são as organizações.
    await heading(navLabels.organizations);
    await act(() => router.navigate(alertPath(ABSENCE)));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('abre o painel e o detalhe de um indicador ao administrador', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate(dashboardIndicatorPath('users')));
    expect(
      await heading(dashboardIndicatorContent.titles.users),
    ).toBeInTheDocument();
  });

  it('nega o detalhe de um indicador ao profissional', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);
    await act(() => router.navigate(dashboardIndicatorPath('users')));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('liga a lista de usuários à página do usuário', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate(PATHS.USERS));
    expect(
      await screen.findByRole('button', { name: userListContent.newUser }),
    ).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('link', { name: 'Rafael Moura Brandão' }),
    );
    expect(await heading('Rafael Moura Brandão')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(userPath(RAFAEL));
  });

  it('nega a página do usuário ao profissional', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);
    await act(() => router.navigate(userPath(RAFAEL)));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('abre os relatórios pelo menu e pelo detalhe do paciente', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);

    await act(() => router.navigate(patientPath(DIRCE)));
    fireEvent.click(
      await screen.findByRole('link', {
        name: patientDetailContent.actions.report,
      }),
    );
    expect(await heading(reportsPageContent.title)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Dirce Albuquerque Moraes' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?paciente=${DIRCE}`);
  });

  it('nega os relatórios à cuidadora', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('caregiver');
    await heading(navLabels.patients);
    await act(() => router.navigate(PATHS.REPORTS));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
    expect(
      screen.queryByText(patientReportContent.picker.choosePatient),
    ).toBeNull();
  });

  it('liga a auditoria ao evento e o evento ao item', async () => {
    apiStub().use(auditRoutes());
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    await act(() => router.navigate(PATHS.AUDIT));
    expect(
      await screen.findByRole('button', { name: auditListContent.exportCsv }),
    ).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('link', { name: 'Alterou perfil de usuário' }),
    );
    expect(await heading('Alterou perfil de usuário')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      auditEventPath(PROFILE_CHANGED_EVENT),
    );
    fireEvent.click(
      await screen.findByRole('link', { name: 'Patrícia Lemos Duarte' }),
    );
    expect(await heading('Patrícia Lemos Duarte')).toBeInTheDocument();
  });

  it('nega o evento de auditoria ao profissional', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('professional');
    await heading(navLabels.patients);
    await act(() => router.navigate(auditEventPath(PROFILE_CHANGED_EVENT)));
    expect(await heading(statusContent.accessDenied.title)).toBeInTheDocument();
  });

  it('liga as organizações ao cadastro e à página da organização', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('platform_admin');
    await heading(navLabels.organizations);

    fireEvent.click(
      await screen.findByRole('link', { name: organizationNewContent.title }),
    );
    expect(await heading(organizationNewContent.title)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.ORGANIZATION_NEW);

    await act(() => router.navigate(PATHS.ORGANIZATIONS));
    const table = await screen.findByRole('table');
    fireEvent.click(
      await within(table).findByRole('link', { name: 'Clínica Bem Viver' }),
    );
    expect(await heading('Clínica Bem Viver')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(organizationPath(BEM_VIVER));
  });

  it('nega as organizações ao administrador da organização', async () => {
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);
    for (const path of [
      PATHS.ORGANIZATIONS,
      PATHS.ORGANIZATION_NEW,
      organizationPath(BEM_VIVER),
    ]) {
      await act(() => router.navigate(path));
      expect(
        await heading(statusContent.accessDenied.title),
      ).toBeInTheDocument();
    }
  });

  it('abre as configurações pelo menu e troca a senha pelo menu do usuário, de volta ao login com o aviso', async () => {
    apiStub().use({ 'PUT /auth/password': () => ({ data: null, meta: {} }) });
    const router = renderApp(PATHS.LOGIN);
    await signInAs('admin');
    await heading(navLabels.dashboard);

    fireEvent.click(screen.getByRole('link', { name: navLabels.settings }));
    expect(
      await screen.findByRole('region', {
        name: organizationSectionContent.title,
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATHS.SETTINGS);

    fireEvent.click(screen.getByRole('button', { name: /Helena Vasconcelos/ }));
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: changePasswordContent.menuItem,
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: changePasswordContent.title,
    });
    const values = {
      currentPassword: credentialsFor('admin').password,
      newPassword: 'senha-nova-da-helena',
      confirmation: 'senha-nova-da-helena',
    };
    for (const [name, value] of Object.entries(values)) {
      fireEvent.change(
        within(dialog).getByLabelText(accessFields[name].label),
        { target: { value } },
      );
    }
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: changePasswordContent.submit,
      }),
    );

    expect(await heading(loginContent.title)).toBeInTheDocument();
    expect(screen.getByText(loginContent.passwordChanged)).toBeInTheDocument();
  });
});

// Tela importada direto volta para o pacote principal e pesa na primeira
// carga de qualquer endereço. A página de estado é a exceção: ela é a tela de
// erro quando o arquivo de outra tela não carrega.
describe('carregamento sob demanda', () => {
  it('cada tela chega ao roteador por import dinâmico, menos a página de estado', () => {
    const pages = Object.keys(import.meta.glob('../src/pages/**/*Page.jsx'))
      .map((path) => path.replace('../src/pages/', ''))
      .filter((path) => path !== 'Status/StatusPage.jsx');
    const staticImports = (source) =>
      [...source.matchAll(/^import [^;]+ from '\.\/pages\/([^']+)';$/gm)].map(
        (match) => match[1],
      );
    const onDemand = [
      ...lazyPagesSource.matchAll(/import\(\s*'\.\/pages\/([^']+)'\s*\)/g),
    ].map((match) => match[1]);

    expect(staticImports(routesSource)).toEqual(['Status/StatusPage.jsx']);
    expect(staticImports(lazyPagesSource)).toEqual([]);
    expect(onDemand.toSorted()).toEqual(pages.toSorted());
  });
});

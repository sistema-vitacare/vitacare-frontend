import { DEMO_PASSWORD } from './mocks/credentials.js';
import { organization } from './mocks/organization.js';
import { users } from './mocks/users.js';

export const loginContent = {
  title: 'Entrar no VitaCare',
  subtitle: 'Use o código da sua organização, o e-mail e a senha.',
  submit: 'Entrar',
  forgotPassword: 'Esqueci minha senha',
  expired: 'Sua sessão expirou. Entre novamente para continuar.',
  passwordChanged: 'Senha definida. Entre com a nova senha.',
  // Mensagem única: a API não diz qual campo errou, e a tela também não.
  invalidCredentials: 'Código da organização, e-mail ou senha incorretos.',
  // A API não informa quanto falta para o desbloqueio; o bloqueio dura 15
  // minutos a partir da última tentativa.
  blocked:
    'Muitas tentativas sem sucesso. Por segurança, o acesso a esta conta está pausado. Tente de novo em até 15 minutos.',
  demoTitle: 'Acesso de demonstração',
  demoText:
    'Escolha um perfil para entrar direto com um usuário de demonstração.',
  demoFormText: 'Ou use o formulário com estes dados:',
  demoError: 'Não foi possível entrar. Tente de novo.',
};

const admin = users.find(
  (user) => user.profile.code === 'admin' && user.status === 'active',
);
const invited = users.find((user) => user.status === 'pending');

// Dados para entrar pelo formulário no modo de dados simulados.
export const demoCredentials = [
  { label: 'Código da organização', value: organization.code },
  { label: 'Senha', value: DEMO_PASSWORD },
  { label: 'E-mail da administradora', value: admin.email },
  { label: 'E-mail da convidada (primeiro acesso)', value: invited.email },
];

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
};

export const recoveryContent = {
  title: 'Recuperar senha',
  subtitle: 'Informe o código da organização e o e-mail da sua conta.',
  submit: 'Pedir recuperação',
  backToLogin: 'Voltar para o login',
  // A orientação depois do envio vem da API (`meta.message`), porque depende
  // de o servidor de e-mail estar configurado.
  blocked:
    'Muitos pedidos de recuperação para esta conta. Tente de novo em até uma hora.',
};

export const resetContent = {
  title: 'Definir nova senha',
  subtitle: 'Escolha a nova senha da sua conta.',
  submit: 'Salvar nova senha',
  success: 'Senha redefinida. Entre com a nova senha.',
  invalidLink:
    'Este link de recuperação é inválido, já foi usado ou venceu. Peça um novo link.',
  requestNewLink: 'Pedir novo link',
  backToLogin: 'Ir para o login',
};

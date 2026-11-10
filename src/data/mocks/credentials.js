// Credenciais e respostas da autenticação simulada. A senha fica fora do
// objeto do usuário porque a API nunca devolve senha; na integração, este
// arquivo deixa de existir.

/** Senha inventada de todos os usuários de demonstração. */
export const DEMO_PASSWORD = 'vitacare-demo';

/**
 * Link de recuperação aceito pela redefinição simulada. Sem servidor de
 * e-mail, nenhum link chega ao usuário; este abre a tela em
 * `/redefinir-senha?token=link-de-demonstracao`.
 */
export const DEMO_RESET_LINK = Object.freeze({
  token: 'link-de-demonstracao',
  organizationCode: 'ipe-amarelo',
  email: 'rafael.brandao@ipeamarelo.example',
});

// Texto de `meta.message` que a API devolve ao pedido de recuperação sem
// servidor de e-mail, o estado de todos os ambientes (manual da API,
// `auth-solicitar-recuperacao.md`, conferido em 10/11/2026).
export const RECOVERY_GUIDANCE =
  'A recuperação por e-mail não está disponível. Procure o administrador da sua organização para receber uma senha temporária.';

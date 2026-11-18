// Textos comuns às telas de acesso: login, recuperação, redefinição e
// primeiro acesso.

export const accessLayout = {
  brandTitle: 'O cuidado de cada paciente, registrado e acompanhado.',
  brandText:
    'Registro de visitas, medicamentos e alertas em um só lugar, para a equipe e para a família.',
  highlights: [
    'Alertas quando um valor registrado sai da faixa definida',
    'Histórico e evolução de cada paciente',
    'Acesso por perfil: profissional, cuidador e familiar',
  ],
};

export const accessFields = {
  organizationCode: {
    label: 'Código da organização',
    helper: 'Informado pela sua organização. Exemplo: ipe-amarelo',
  },
  email: { label: 'E-mail' },
  password: { label: 'Senha' },
  currentPassword: { label: 'Senha atual' },
  newPassword: { label: 'Nova senha', helper: 'De 8 a 128 caracteres.' },
  confirmation: { label: 'Confirme a nova senha' },
};

export const passwordToggle = {
  show: 'Mostrar senha',
  hide: 'Ocultar senha',
};

// Mensagem por campo e por código de `FIELD_ERRORS`.
export const fieldErrorMessages = {
  organizationCode: {
    required: 'Informe o código da organização.',
    tooShort: 'O código tem pelo menos 3 caracteres.',
    tooLong: 'O código tem no máximo 50 caracteres.',
    invalid: 'Use letras minúsculas, números e hífens, como ipe-amarelo.',
  },
  email: {
    required: 'Informe o e-mail.',
    tooLong: 'O e-mail tem no máximo 254 caracteres.',
    invalid: 'Informe um e-mail válido, como nome@organizacao.com.br.',
  },
  password: {
    required: 'Informe a senha.',
    tooShort: 'A senha tem pelo menos 8 caracteres.',
    tooLong: 'A senha tem no máximo 128 caracteres.',
    invalid: 'Senha em formato inválido.',
  },
  newPassword: {
    required: 'Informe a nova senha.',
    tooShort: 'Use pelo menos 8 caracteres.',
    tooLong: 'Use no máximo 128 caracteres.',
    invalid: 'Senha em formato inválido.',
    reuse: 'A nova senha precisa ser diferente da senha provisória.',
    sameAsCurrent: 'A nova senha precisa ser diferente da atual.',
  },
  currentPassword: {
    required: 'Informe a senha atual.',
    tooShort: 'A senha tem pelo menos 8 caracteres.',
    tooLong: 'A senha tem no máximo 128 caracteres.',
    invalid: 'Senha em formato inválido.',
    wrong: 'A senha atual não confere.',
  },
  confirmation: {
    required: 'Repita a nova senha.',
    mismatch: 'As senhas não conferem.',
  },
};

// Troca da própria senha, pelo menu do usuário, em qualquer perfil.
export const changePasswordContent = {
  menuItem: 'Alterar senha',
  title: 'Alterar senha',
  intro:
    'Depois da troca, todas as sessões da sua conta são encerradas, inclusive esta, e você entra de novo com a senha nova.',
  submit: 'Alterar senha',
  cancel: 'Cancelar',
};

export const accessErrors = {
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

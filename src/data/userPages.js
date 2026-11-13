// Textos da tela de usuários (FE-23, UC03, Figura 44): lista, página do
// usuário e diálogos. Os nomes dos perfis vêm de `profiles.js`.

export const userSituationLabels = {
  active: 'Ativo',
  invited: 'Convidado',
  expired: 'Convite vencido',
  invalidated: 'Link cancelado',
  inactive: 'Inativo',
};

export const userListContent = {
  title: 'Usuários',
  subtitle: (total) => `${total} ${total === 1 ? 'usuário' : 'usuários'}`,
  newUser: 'Novo usuário',
  searchLabel: 'Buscar usuário',
  searchPlaceholder: 'Nome ou e-mail',
  profileLabel: 'Perfil',
  allProfiles: 'Todos os perfis',
  statusLabel: 'Situação',
  allStatuses: 'Todas as situações',
  statusOptions: {
    active: 'Ativos',
    pending: 'Convidados',
    inactive: 'Inativos',
  },
  countersLabel: 'Usuários ativos por perfil',
  seats: (used, limit) => `${used} de ${limit} vagas do plano em uso`,
  columns: {
    name: 'Usuário',
    profile: 'Perfil',
    status: 'Situação',
    lastAccess: 'Último acesso',
  },
  neverAccessed: 'Nunca entrou',
  invitationUntil: (when) => `Até ${when}`,
  empty: 'Nenhum usuário cadastrado.',
  noResults: 'Nenhum usuário encontrado para os filtros aplicados.',
  range: (first, last, total) => `Mostrando ${first}–${last} de ${total}`,
  paginationLabel: 'Páginas da lista de usuários',
};

export const userDetailContent = {
  dataTitle: 'Dados',
  fields: {
    email: 'E-mail',
    cpf: 'CPF',
    phone: 'Telefone',
    profile: 'Perfil',
    status: 'Situação',
    lastAccess: 'Último acesso',
    createdAt: 'Cadastro',
  },
  noPhone: 'Não informado',
  invitationTitle: 'Convite',
  invitationFields: {
    channel: 'Canal',
    expiresAt: 'Validade',
    sentAt: 'Enviado em',
  },
  channelLabels: {
    temporary_password: 'Senha provisória',
    email: 'Link por e-mail',
  },
  notSent: 'Não enviado',
  invitationHint: {
    expired: 'O convite venceu. Reemita para o usuário poder entrar.',
    invalidated:
      'O link foi cancelado, porque o envio falhou ou o e-mail mudou. Reemita o convite.',
  },
  actions: {
    edit: 'Editar',
    changeProfile: 'Alterar perfil',
    reissueInvitation: 'Reemitir convite',
    reissueWithPassword: 'Reemitir com senha provisória',
    temporaryPassword: 'Gerar senha provisória',
    deactivate: 'Inativar',
    reactivate: 'Reativar',
  },
  deactivate: {
    title: 'Inativar usuário?',
    text: (name) =>
      `${name} perde o acesso na hora: as sessões abertas são encerradas e o login deixa de funcionar. Os registros feitos por essa pessoa continuam no sistema.`,
    confirm: 'Inativar',
  },
  reactivate: {
    title: 'Reativar usuário?',
    text: (name) =>
      `${name} volta a ter acesso, e a conta passa a ocupar uma vaga do plano.`,
    confirm: 'Reativar',
  },
  unexpected: 'Não foi possível concluir. Tente de novo.',
};

export const userFormContent = {
  newTitle: 'Novo usuário',
  editTitle: 'Editar usuário',
  newIntro:
    'O usuário recebe um convite e define a própria senha no primeiro acesso.',
  name: 'Nome',
  email: 'E-mail',
  cpf: 'CPF',
  phone: 'Telefone',
  profile: 'Perfil',
  cancel: 'Cancelar',
  save: 'Salvar',
  invalidFields: 'Confira os campos destacados.',
  unexpected: 'Não foi possível salvar. Tente de novo.',
};

// Mensagem de cada campo pelo código da regra (API ou tela).
export const userFieldErrors = {
  name: {
    MIN_LENGTH: 'Informe o nome.',
    MAX_LENGTH: 'Use até 180 caracteres.',
    default: 'Confira o nome.',
  },
  email: {
    IS_EMAIL: 'Informe um e-mail válido.',
    MAX_LENGTH: 'Use até 254 caracteres.',
    DUPLICATE:
      'Este e-mail já é usado na organização, inclusive por usuário inativo.',
    default: 'Confira o e-mail.',
  },
  cpf: {
    IS_CPF: 'Informe um CPF válido.',
    DUPLICATE:
      'Este CPF já é usado na organização, inclusive por usuário inativo.',
    default: 'Confira o CPF.',
  },
  phone: {
    MATCHES: 'Use só números, espaço, +, parênteses e hífen.',
    MAX_LENGTH: 'Use até 32 caracteres.',
    default: 'Confira o telefone.',
  },
  profileCode: {
    IS_IN: 'Escolha o perfil.',
    default: 'Confira o perfil.',
  },
};

export const profileDialogContent = {
  title: 'Alterar perfil',
  profile: 'Perfil',
  warning:
    'Os vínculos de cuidado que não combinam com o novo perfil são revogados.',
  cancel: 'Cancelar',
  save: 'Alterar perfil',
  unexpected: 'Não foi possível alterar o perfil. Tente de novo.',
};

export const invitationResultContent = {
  passwordTitle: 'Senha provisória',
  passwordIntro: (name) => `Entregue esta senha a ${name}.`,
  passwordLabel: 'Senha provisória',
  validUntil: (when) => `Vale até ${when}.`,
  onlyOnce:
    'A senha aparece só agora. Depois de fechar, ela não pode ser vista de novo.',
  copy: 'Copiar',
  copied: 'Senha copiada.',
  copyFailed: 'Não foi possível copiar. Selecione a senha e copie.',
  emailTitle: 'Convite por e-mail',
  close: 'Fechar',
};

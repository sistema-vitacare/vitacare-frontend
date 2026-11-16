// Textos das telas de organizações da plataforma (FE-27, UC03): lista,
// cadastro com o primeiro administrador e dados com a situação. Rótulos e
// mensagens dos campos editáveis da organização ficam em
// `organizationFields.js`; os do administrador são os do cadastro de
// usuário (`userPages.js`).

export const organizationStatusLabels = {
  active: 'Ativa',
  inactive: 'Inativa',
};

export const organizationListContent = {
  title: 'Organizações',
  subtitle: (total) =>
    `${total} ${total === 1 ? 'organização cliente' : 'organizações clientes'}`,
  newOrganization: 'Nova organização',
  searchLabel: 'Buscar organização',
  searchPlaceholder: 'Nome fantasia, razão social ou código',
  statusLabel: 'Situação',
  allStatuses: 'Todas',
  statusOptions: {
    active: 'Ativas',
    inactive: 'Inativas',
  },
  columns: {
    name: 'Organização',
    plan: 'Plano',
    status: 'Situação',
    createdAt: 'Cadastro',
  },
  code: (code) => `Código ${code}`,
  empty: 'Nenhuma organização cliente cadastrada.',
  noResults: 'Nenhuma organização encontrada para os filtros aplicados.',
  range: (first, last, total) => `Mostrando ${first}–${last} de ${total}`,
  paginationLabel: 'Páginas da lista de organizações',
};

export const organizationNewContent = {
  title: 'Nova organização',
  subtitle:
    'A organização, o plano e o primeiro administrador são cadastrados juntos.',
  sections: {
    organization: 'Organização',
    plan: 'Plano',
    administrator: 'Primeiro administrador',
  },
  codeHelper:
    'Minúsculas, números e hífens. É usado no login e não muda depois.',
  plan: 'Plano',
  planOption: (users, patients) =>
    `Até ${users} usuários e ${patients} pacientes ativos`,
  administratorIntro:
    'Recebe uma senha provisória, que troca no primeiro acesso, e depois cadastra os outros usuários.',
  administrator: {
    name: 'Nome',
    email: 'E-mail',
    cpf: 'CPF',
    phone: 'Telefone',
  },
  cancel: 'Cancelar',
  save: 'Cadastrar organização',
  invalidFields: 'Confira os campos destacados.',
  unexpected: 'Não foi possível cadastrar agora. Tente de novo em instantes.',
};

// Mensagens dos campos que só o cadastro tem, pelo código da API.
export const newOrganizationFieldErrors = {
  code: {
    MIN_LENGTH: 'Use pelo menos 3 caracteres.',
    MAX_LENGTH: 'Use no máximo 50 caracteres.',
    MATCHES:
      'Use letras minúsculas, números e hífens, sem hífen no começo, no fim ou repetido.',
    DUPLICATE: 'Já existe uma organização com este código.',
    default: 'Código inválido.',
  },
  usagePlanId: {
    IS_UUID: 'Escolha o plano.',
    NOT_FOUND: 'Este plano não está disponível. Escolha outro.',
    default: 'Escolha o plano.',
  },
};

export const organizationCreatedContent = {
  title: 'Organização cadastrada',
  intro: (administrator, organization) =>
    `Entregue esta senha a ${administrator}, primeiro administrador de ${organization}.`,
  loginCode: (code) => `No login, o código da organização é ${code}.`,
  validUntil:
    'A senha vale até ser trocada, o que o sistema exige no primeiro acesso.',
  onlyOnce:
    'A senha aparece só agora. Depois de fechar, ela não pode ser vista de novo.',
  open: 'Abrir organização',
};

export const organizationDataContent = {
  title: 'Dados da organização',
  fields: {
    status: 'Situação',
    createdAt: 'Cadastro',
  },
  none: '—',
  edit: 'Editar',
  saved: 'Dados da organização salvos.',
  deactivate: {
    action: 'Inativar',
    title: 'Inativar a organização?',
    text: (name) =>
      `Todos os usuários de ${name} perdem o acesso na hora: as sessões abertas são encerradas, e os links de recuperação de senha e de convite deixam de valer. Na reativação, o acesso volta pelo login, mas sessões e convites não voltam. Cadastro, usuários e histórico são preservados.`,
    done: 'Organização inativada.',
  },
  reactivate: {
    action: 'Reativar',
    title: 'Reativar a organização?',
    text: (name) =>
      `Os usuários ativos de ${name} voltam a entrar pelo login. Convites cancelados na inativação precisam ser reemitidos pelo administrador da organização.`,
    done: 'Organização reativada.',
  },
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

// Textos das configurações (FE-26, UC04, Figura 46): dados da organização,
// plano e uso e solicitação de mudança de plano.

export const settingsContent = {
  title: 'Configurações',
  none: '—',
};

export const organizationSectionContent = {
  title: 'Organização',
  edit: 'Editar',
  saved: 'Dados da organização salvos.',
  fields: {
    tradeName: 'Nome fantasia',
    legalName: 'Razão social',
    document: 'Documento',
    phone: 'Telefone',
    email: 'E-mail',
    code: 'Código da organização',
  },
};

export const organizationFormContent = {
  title: 'Editar organização',
  intro:
    'O código da organização, usado no login, não muda. Campo opcional apagado fica em branco.',
  documentHelper: 'CNPJ ou outro documento, com a pontuação.',
  save: 'Salvar',
  cancel: 'Cancelar',
  invalidFields: 'Confira os campos destacados.',
  unexpected: 'Não foi possível salvar agora. Tente de novo em instantes.',
};

// Mensagem por campo e pelo código que a API devolve para ele.
export const organizationFieldErrors = {
  tradeName: {
    MIN_LENGTH: 'Informe o nome fantasia.',
    MAX_LENGTH: 'Use no máximo 180 caracteres.',
    default: 'Nome fantasia inválido.',
  },
  legalName: {
    MAX_LENGTH: 'Use no máximo 180 caracteres.',
    default: 'Razão social inválida.',
  },
  document: {
    MATCHES: 'Use números, letras e a pontuação do documento.',
    MAX_LENGTH: 'Use no máximo 32 caracteres.',
    DUPLICATE: 'Já existe uma organização com este documento.',
    default: 'Documento inválido.',
  },
  phone: {
    MATCHES: 'Use números, espaços, parênteses, + e -.',
    MAX_LENGTH: 'Use no máximo 32 caracteres.',
    default: 'Telefone inválido.',
  },
  email: {
    IS_EMAIL: 'Informe um e-mail válido, como contato@organizacao.com.br.',
    MAX_LENGTH: 'Use no máximo 254 caracteres.',
    default: 'E-mail inválido.',
  },
};

// Recursos do plano com os nomes do Quadro 2 do TCC (seção 3.3), pelos
// códigos da API.
export const planFeatureLabels = {
  patient_management: 'Cadastro de pacientes',
  health_records: 'Registro de informações de saúde',
  patient_history: 'Histórico do paciente',
  automatic_alerts: 'Alertas automáticos',
  responsive_access: 'Acesso responsivo pelo celular',
  extended_registration: 'Cadastro ampliado de usuários e pacientes',
  management_reports: 'Relatórios gerenciais',
  operational_dashboard: 'Painel de controle operacional',
  custom_deployment: 'Implantação e personalização',
};

export const planSectionContent = {
  title: 'Plano e uso',
  term: (startsAt, endsAt) =>
    endsAt
      ? `Vigência de ${startsAt} a ${endsAt}`
      : `Vigência desde ${startsAt}, sem data de fim`,
  expired: 'Vencido',
  featuresLabel: 'Recursos do plano',
  usageLabel: 'Uso do plano',
  usage: {
    users: 'Usuários ativos e convidados',
    patients: 'Pacientes ativos',
  },
  usageValue: (used, limit) => `${used} de ${limit}`,
  request: 'Solicitar mudança de plano',
  pendingTitle: 'Solicitação em análise',
  pending: (from, to, when) => `${from} → ${to}, pedida em ${when}`,
  notes: (text) => `Observação: ${text}`,
  cancel: 'Cancelar solicitação',
  cancelTitle: 'Cancelar a solicitação?',
  cancelText:
    'A solicitação sai da análise da plataforma, e o plano atual continua como está. Depois, outra pode ser feita.',
  keep: 'Manter',
  sent: 'Solicitação enviada. O plano muda só quando a plataforma aprovar.',
  cancelled: 'Solicitação cancelada.',
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export const changeRequestFormContent = {
  title: 'Solicitar mudança de plano',
  intro:
    'O administrador da plataforma analisa o pedido. Plano, limites e vigência só mudam com a aprovação; não há cobrança pelo sistema.',
  planLabel: 'Plano',
  current: 'Plano atual, para renovar a vigência',
  limits: (users, patients) =>
    `Até ${users} usuários e ${patients} pacientes ativos`,
  notes: 'Observação (opcional)',
  notesHelper: 'Até 500 caracteres.',
  choosePlan: 'Escolha um plano.',
  notesTooLong: 'Use no máximo 500 caracteres.',
  submit: 'Enviar solicitação',
  cancel: 'Cancelar',
};

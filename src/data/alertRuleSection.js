// Textos da seção de regras de alerta da página do formulário (UC09, passo
// 5) e do diálogo de nova regra e edição.

export const alertRuleSectionContent = {
  title: 'Regras de alerta',
  subtitle:
    'Quando um valor registrado satisfaz a regra, o sistema gera um alerta para a equipe.',
  add: 'Nova regra',
  rules:
    'A regra de um paciente substitui as regras gerais do mesmo campo para ele. Cada regra vale para os registros enviados a partir de quando foi criada ou alterada; alertas já gerados não mudam.',
  notPublished:
    'Publique o formulário para configurar regras de alerta sobre os campos dele.',
  inactiveForm:
    'Formulário desativado: as regras ficam para consulta, e nenhuma regra nova é aceita.',
  noNumericFields:
    'Este formulário não tem campo de número ou de escala para monitorar.',
  empty: 'Nenhuma regra neste formulário.',
  listLabel: 'Regras de alerta do formulário',
  condition: (field, operator, reference) =>
    `${field} ${operator} ${reference}`,
  everyone: 'Todos os pacientes do formulário',
  onlyFor: (name) => `Só para ${name}`,
  status: { active: 'Ativa', inactive: 'Inativa' },
  edit: 'Editar',
  editOf: (name) => `Editar ${name}`,
  deactivate: 'Inativar',
  deactivateOf: (name) => `Inativar ${name}`,
  reactivate: 'Reativar',
  reactivateOf: (name) => `Reativar ${name}`,
  saved: 'Regra salva. Ela vale para os registros enviados a partir de agora.',
  deactivated: 'Regra inativada. Os alertas que ela já gerou continuam.',
  reactivated: 'Regra reativada para os próximos registros.',
  deactivateDialog: {
    title: (name) => `Inativar ${name}?`,
    text: 'A regra deixa de avaliar os próximos registros. Os alertas que ela já gerou continuam e podem ser consultados.',
    confirm: 'Inativar',
  },
  errors: {
    ALERT_RULE_ALREADY_INACTIVE: 'A regra já estava inativa.',
    ALERT_RULE_ALREADY_ACTIVE: 'A regra já estava ativa.',
  },
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export const alertRuleDialogContent = {
  newTitle: 'Nova regra de alerta',
  editTitle: 'Editar regra de alerta',
  field: 'Campo monitorado',
  fieldHelper: 'Só campos de número ou de escala da versão vigente.',
  scaleRange: (min, max) => `escala de ${min} a ${max}`,
  patient: 'Vale para',
  everyone: 'Todos os pacientes do formulário',
  patientHelper:
    'A regra de um paciente substitui as gerais do mesmo campo para ele.',
  lockedHelper: 'Campo e paciente não mudam; outra combinação é outra regra.',
  name: 'Nome da regra',
  nameHelper: 'Vira o título do alerta.',
  description: 'Descrição',
  operator: 'Condição',
  reference: 'Valor de referência',
  referenceHelper:
    'Na unidade do campo, com até 3 casas decimais. O sistema não sugere valores.',
  severity: 'Severidade',
  cancel: 'Cancelar',
  save: 'Salvar',
  invalidFields: 'Revise os campos destacados antes de salvar.',
  unexpected: 'Não foi possível salvar agora. Tente de novo em instantes.',
  errors: {
    FORM_NOT_FOUND:
      'O formulário não foi encontrado ou ainda não foi publicado.',
    ALERT_RULE_FORM_INACTIVE:
      'O formulário foi desativado. Reative-o antes de criar regras.',
    ALERT_RULE_PATIENT_INACTIVE:
      'O paciente está inativo. Reative-o antes de criar regras para ele.',
    ALERT_RULE_INACTIVE: 'A regra foi inativada. Reative-a antes de editar.',
    ALERT_RULE_NOTHING_TO_UPDATE: 'Nenhuma alteração para salvar.',
    PATIENT_NOT_FOUND: 'Paciente não encontrado.',
  },
};

// Mensagem por campo e por código das regras da API (`alertRules.js`) e dos
// erros do serviço que apontam um campo.
export const alertRuleFieldErrors = {
  fieldKey: {
    NOT_FOUND: 'O campo não existe na versão vigente do formulário.',
    NOT_NUMERIC: 'Escolha um campo de número ou de escala.',
    default: 'Escolha o campo monitorado.',
  },
  patientId: {
    NOT_APPLICABLE: 'O formulário não vale para este paciente.',
    default: 'Escolha um paciente da lista.',
  },
  name: {
    MAX_LENGTH: 'Use no máximo 120 caracteres.',
    default: 'Informe o nome da regra.',
  },
  description: {
    MAX_LENGTH: 'Use no máximo 500 caracteres.',
    default: 'A descrição não pode ficar em branco.',
  },
  operator: { default: 'Escolha a condição.' },
  referenceValue: {
    HAS_MAX_DECIMALS: 'Use no máximo 3 casas decimais.',
    MIN: 'O valor de referência é pequeno demais.',
    MAX: 'O valor de referência é grande demais.',
    default: 'Informe o valor de referência como número.',
  },
  severity: { default: 'Escolha a severidade.' },
};

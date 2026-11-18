export const formPageContent = {
  newTitle: 'Novo formulário',
  notFound: 'Formulário não encontrado ou sem acesso.',
  backToList: 'Voltar à lista de formulários',
  versionInfo: (number, date) => `Versão ${number}, publicada em ${date}`,
  neverPublished: 'Ainda não publicado',
  inactiveNotice: (date) =>
    `Formulário desativado em ${date}. Os registros já feitos continuam no histórico; para alterá-lo ou receber registros, reative-o.`,
  data: {
    title: 'Dados do formulário',
    name: 'Nome',
    description: 'Descrição',
    trackingType: 'Tipo de acompanhamento',
    trackingTypeHelper: 'Exemplo: Dados clínicos, Rotina, Visita domiciliar.',
    hasFrequency: 'Frequência esperada de preenchimento',
    frequencyHelper:
      'Cada período vencido sem registro gera um alerta de ausência.',
    interval: 'A cada',
    unit: 'Unidade',
    audience: 'Público',
    patients: 'Pacientes',
    patientsPlaceholder: 'Busque pelo nome',
    noPatients: 'Nenhum paciente ativo encontrado',
    save: 'Salvar dados',
    saved: 'Dados salvos.',
    emptyValue: 'Não informado',
    audienceValue: (count) =>
      `${count} ${count === 1 ? 'paciente selecionado' : 'pacientes selecionados'}`,
  },
  fields: {
    title: 'Campos',
    noSection: 'Sem seção',
    empty: 'Nenhum campo ainda. Inclua os campos que o cuidador vai preencher.',
    add: 'Adicionar campo',
    edit: (name) => `Editar o campo ${name}`,
    remove: (name) => `Remover o campo ${name}`,
    moveUp: (name) => `Subir o campo ${name}`,
    moveDown: (name) => `Descer o campo ${name}`,
    requirementLabel: (name) => `Obrigatoriedade de ${name}`,
    draftNotice: (next, date, current) =>
      `Rascunho da versão ${next}, salvo em ${date}. A versão ${current} continua valendo até a publicação.`,
    firstDraftNotice: (date) =>
      `Rascunho salvo em ${date}. O formulário só recebe registros depois de publicado.`,
    currentNotice: (number) =>
      `Campos da versão ${number}. As alterações ficam num rascunho até a publicação, e os registros já feitos não mudam.`,
    unsaved: 'Há alterações nos campos ainda não salvas.',
    saveDraft: 'Salvar rascunho',
    publish: 'Publicar',
    discard: 'Descartar alterações',
    publishHint: 'Salve o rascunho antes de publicar.',
    draftSaved: 'Rascunho salvo.',
    published: (number) => `Versão ${number} publicada.`,
    discarded: 'Alterações descartadas.',
    detail: {
      number: (unit, decimals) =>
        [
          unit,
          decimals === 0
            ? 'inteiro'
            : `${decimals} ${decimals === 1 ? 'casa decimal' : 'casas decimais'}`,
        ]
          .filter(Boolean)
          .join(' · '),
      scale: (min, max) => `De ${min} a ${max}`,
      options: (options) => options.join(', '),
    },
  },
  dialog: {
    newTitle: 'Novo campo',
    editTitle: 'Editar campo',
    name: 'Nome do campo',
    fieldType: 'Tipo',
    typeLocked:
      'O tipo de um campo já publicado não muda. Para outro tipo, crie um campo novo.',
    requirement: 'Obrigatoriedade',
    section: 'Seção',
    sectionHelper: 'Os campos aparecem agrupados pela seção.',
    unit: 'Unidade',
    unitHelper: 'Exemplo: mmHg, mg/dL, °C.',
    decimalPlaces: 'Casas decimais',
    scaleMin: 'Início da escala',
    scaleMax: 'Fim da escala',
    options: 'Opções',
    optionsHelper: 'Uma opção por linha, de 2 a 50.',
    cancel: 'Cancelar',
    confirm: 'Aplicar',
  },
  actions: {
    deactivate: 'Desativar',
    reactivate: 'Reativar',
  },
  publishDialog: {
    title: (number) => `Publicar a versão ${number}?`,
    text: (current) =>
      `A versão nova substitui a versão ${current} para os registros feitos a partir de agora. Os registros já feitos continuam ligados à versão que responderam.`,
    confirm: 'Publicar',
  },
  discardDialog: {
    title: 'Descartar as alterações?',
    text: 'O rascunho é apagado, e os campos voltam a ser os da versão vigente.',
    confirm: 'Descartar',
  },
  deactivateDialog: {
    title: 'Desativar o formulário?',
    text: 'Ele deixa de receber registros e sai da lista do cuidador. Versões e registros já feitos são preservados.',
    confirm: 'Desativar',
  },
  reactivateDialog: {
    title: 'Reativar o formulário?',
    text: 'Ele volta a valer para o público definido, nas mesmas condições de antes.',
    confirm: 'Reativar',
  },
  errors: {
    empty: 'Inclua ao menos um campo no formulário.',
    invalidFields: 'Revise os campos indicados.',
    fieldsInvalid: (name, message) => `${name}: ${message}`,
    unexpected: 'Não foi possível concluir. Tente novamente.',
    FORM_EMPTY: 'Inclua ao menos um campo que não esteja desabilitado.',
    FORM_INACTIVE: 'O formulário está desativado.',
    FORM_INVALID_PATIENTS:
      'Algum paciente selecionado não está ativo. Revise a lista.',
    FORM_NO_DRAFT: 'Não há rascunho salvo.',
    FORM_NOT_PUBLISHED:
      'O formulário nunca foi publicado; para tirá-lo de uso, desative-o.',
    FORM_ALREADY_INACTIVE: 'O formulário já estava desativado.',
    FORM_ALREADY_ACTIVE: 'O formulário já estava ativo.',
  },
};

// Mensagem por campo da tela e por código de erro.
export const formFieldErrors = {
  name: {
    required: 'Informe o nome.',
    tooLong: 'Use no máximo 120 caracteres.',
    duplicate: 'Já existe um campo com este nome.',
  },
  description: { tooLong: 'Use no máximo 1.000 caracteres.' },
  trackingType: { tooLong: 'Use no máximo 80 caracteres.' },
  interval: { invalid: 'Informe um número inteiro de 1 a 365.' },
  patientIds: { required: 'Escolha ao menos um paciente.' },
  section: { tooLong: 'Use no máximo 60 caracteres.' },
  unit: { tooLong: 'Use no máximo 20 caracteres.' },
  scaleMin: {
    required: 'Informe o início.',
    invalid: 'Use um número inteiro de -1000 a 1000.',
  },
  scaleMax: {
    required: 'Informe o fim.',
    invalid: 'Use um número inteiro de -1000 a 1000.',
    invalidRange: 'O fim precisa ser maior que o início.',
  },
  options: {
    required: 'Informe as opções.',
    tooFew: 'Informe ao menos 2 opções.',
    tooMany: 'Use no máximo 50 opções.',
    duplicate: 'Há opções repetidas.',
    tooLong: 'Cada opção tem no máximo 120 caracteres.',
  },
  fallback: 'Revise este valor.',
};

// Textos das telas de registros de acompanhamento: a lista do menu
// Registros e o detalhe de um registro.
export const followUpListContent = {
  title: 'Registros',
  subtitle: 'Registros de acompanhamento de um paciente.',
  patient: 'Paciente',
  patientPlaceholder: 'Busque pelo nome',
  choosePatient:
    'Escolha um paciente para ver os registros de acompanhamento dele.',
  noPatients: 'Nenhum paciente ativo encontrado',
  openPatient: 'Abrir o paciente',
};

export const followUpDetailContent = {
  title: 'Registro de acompanhamento',
  notFound: 'Registro não encontrado ou sem acesso.',
  backToRecords: 'Voltar aos registros',
  created: 'Registro salvo.',
  summary: {
    title: 'Resumo',
    patient: 'Paciente',
    form: 'Formulário',
    version: (number) => `versão ${number}`,
    visitedAt: 'Visita',
    submittedAt: 'Enviado em',
    author: 'Responsável pelo registro',
    status: 'Situação',
  },
  status: { valid: 'Válido', annulled: 'Anulado' },
  annulled: (name, date, reason) =>
    `Anulado por ${name} em ${date}. Motivo: ${reason}`,
  answers: { title: 'Respostas', noSection: 'Outros', yes: 'Sim', no: 'Não' },
  notes: 'Observações da visita',
  alerts: {
    title: 'Alertas gerados por este registro',
    empty: 'Nenhum alerta gerado por este registro.',
    open: 'Em aberto',
    resolved: 'Resolvido',
  },
  attachments: {
    title: 'Anexos',
    empty: 'Nenhum anexo.',
    rules: 'JPEG, PNG, WEBP ou PDF de até 10 MB; no máximo 5 por registro.',
    add: 'Anexar arquivo',
    remove: (name) => `Remover o anexo ${name}`,
    removeDialog: {
      title: 'Remover o anexo?',
      text: (name) => `O arquivo ${name} é apagado e não pode ser recuperado.`,
      confirm: 'Remover',
    },
    sentBy: (name, date) => `Enviado por ${name} em ${date}`,
    kinds: {
      'image/jpeg': 'Imagem JPEG',
      'image/png': 'Imagem PNG',
      'image/webp': 'Imagem WEBP',
      'application/pdf': 'PDF',
    },
    uploaded: 'Anexo enviado.',
    removed: 'Anexo removido.',
    errors: {
      EMPTY: 'O arquivo está vazio.',
      TOO_LARGE: 'O arquivo passa de 10 MB.',
      UNSUPPORTED_TYPE: 'Envie uma imagem JPEG, PNG ou WEBP, ou um PDF.',
      ATTACHMENT_UNSUPPORTED_TYPE:
        'O conteúdo do arquivo não é JPEG, PNG, WEBP nem PDF.',
      ATTACHMENT_LIMIT_REACHED: 'O registro já tem 5 anexos.',
      ATTACHMENT_FOLLOW_UP_ANNULLED: 'Registro anulado não recebe anexo.',
      ATTACHMENT_PATIENT_INACTIVE: 'Paciente inativo não recebe anexo.',
      unexpected: 'Não foi possível concluir. Tente novamente.',
    },
  },
  annul: {
    action: 'Anular registro',
    title: 'Anular o registro?',
    text: 'O registro continua no histórico, marcado como anulado, com quem anulou, quando e o motivo. A anulação não pode ser desfeita.',
    reason: 'Motivo',
    reasonHelper: 'Obrigatório, até 500 caracteres.',
    required: 'Informe o motivo.',
    tooLong: 'Use no máximo 500 caracteres.',
    cancel: 'Cancelar',
    confirm: 'Anular',
    done: 'Registro anulado.',
    errors: {
      FOLLOW_UP_ALREADY_ANNULLED: 'O registro já tinha sido anulado.',
      FOLLOW_UP_NOT_AUTHOR: 'Só quem fez o registro pode anulá-lo.',
      unexpected: 'Não foi possível anular. Tente novamente.',
    },
  },
};

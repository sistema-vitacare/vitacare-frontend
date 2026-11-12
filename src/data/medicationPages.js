// Textos da tela de medicamentos do paciente (menu Medicamentos): a lista em
// cartões, o diálogo de cadastro e edição e a inativação. Datas chegam já
// formatadas pela tela.

/** Unidades de dose no singular e no plural: `1 comprimido`, `2 comprimidos`. */
export const doseUnitNames = {
  mg: { one: 'mg', many: 'mg' },
  mcg: { one: 'mcg', many: 'mcg' },
  g: { one: 'g', many: 'g' },
  ml: { one: 'mL', many: 'mL' },
  iu: { one: 'UI', many: 'UI' },
  drops: { one: 'gota', many: 'gotas' },
  tablet: { one: 'comprimido', many: 'comprimidos' },
  capsule: { one: 'cápsula', many: 'cápsulas' },
  application: { one: 'aplicação', many: 'aplicações' },
};

export const routeLabels = {
  oral: 'Oral',
  sublingual: 'Sublingual',
  topical: 'Tópica',
  transdermal: 'Transdérmica',
  inhalation: 'Inalatória',
  nasal: 'Nasal',
  ophthalmic: 'Oftálmica',
  otic: 'Otológica',
  rectal: 'Retal',
  vaginal: 'Vaginal',
  subcutaneous: 'Subcutânea',
  intramuscular: 'Intramuscular',
  intravenous: 'Intravenosa',
  other: 'Outra',
};

const joinTimes = (times) =>
  times.length > 1
    ? `${times.slice(0, -1).join(', ')} e ${times.at(-1)}`
    : times[0];

export const medicationListContent = {
  title: 'Medicamentos',
  subtitle: 'Medicamentos de um paciente, com a agenda e os lembretes.',
  picker: {
    patient: 'Paciente',
    patientPlaceholder: 'Busque pelo nome',
    choosePatient: 'Escolha um paciente para ver os medicamentos dele.',
    noPatients: 'Nenhum paciente ativo encontrado',
    openPatient: 'Abrir o paciente',
  },
  add: 'Novo medicamento',
  count: (total) => (total === 1 ? '1 medicamento' : `${total} medicamentos`),
  empty: 'Nenhum medicamento cadastrado para este paciente.',
  inactivePatient:
    'Paciente inativo: os medicamentos ficam para consulta e só aceitam inativação. Reative o paciente para cadastrar, editar ou reativar.',
  saved: 'Medicamento salvo.',
  deactivated: 'Medicamento inativado. O histórico foi preservado.',
  reactivated: 'Medicamento reativado, com a mesma agenda a partir de agora.',
  conflicts: (conflicts) =>
    `Horário coincidente: ${conflicts
      .map(
        ({ time, medicationName }) => `${time} também é de ${medicationName}`,
      )
      .join('; ')}. O cadastro foi salvo; mude o horário se não for o caso.`,
  deactivateDialog: {
    title: (name) => `Inativar ${name}?`,
    text: 'O medicamento sai da agenda e os lembretes futuros são cancelados. O histórico é preservado, e ele pode ser reativado depois.',
    confirm: 'Inativar',
  },
  errors: {
    MEDICATION_PATIENT_INACTIVE:
      'O paciente está inativo. Reative-o antes de alterar medicamentos.',
    MEDICATION_ALREADY_INACTIVE: 'O medicamento já estava inativo.',
    MEDICATION_ALREADY_ACTIVE: 'O medicamento já estava ativo.',
  },
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export const medicationCardContent = {
  status: { active: 'Ativo', inactive: 'Inativo' },
  timesPerDay: (times) => `${times.length}× ao dia · ${joinTimes(times)}`,
  everyNDays: (days) => `a cada ${days} dias`,
  route: (label) => `Via ${label.toLowerCase()}`,
  since: (date, days) =>
    days === 0
      ? `Desde ${date} (hoje)`
      : `Desde ${date} (há ${days} ${days === 1 ? 'dia' : 'dias'})`,
  startsOn: (date) => `Começa em ${date}`,
  until: (date) => `até ${date}`,
  ended: (date) => `Terminou em ${date}`,
  inactiveSince: (date) => `Inativo desde ${date}`,
  next: (dateTime) => `Próximo horário: ${dateTime}`,
  remindersOn: 'Lembretes ligados',
  remindersOff: 'Sem lembretes',
  conflict: (conflicts) =>
    `Mesmo horário de ${conflicts
      .map(({ medicationName, time }) => `${medicationName} às ${time}`)
      .join(', ')}.`,
  edit: 'Editar',
  deactivate: 'Inativar',
  reactivate: 'Reativar',
};

export const medicationDialogContent = {
  newTitle: 'Novo medicamento',
  editTitle: 'Editar medicamento',
  patient: (name) => `Paciente: ${name}`,
  name: 'Nome',
  dose: 'Dose',
  doseHelper: 'Quantidade por vez, com até 3 casas decimais.',
  doseUnit: 'Unidade',
  route: 'Via',
  routeNotInformed: 'Não informada',
  times: 'Horários',
  timesHelper: 'Hora de Brasília. Cada horário se repete nos dias de dose.',
  time: (index) => `Horário ${index + 1}`,
  addTime: 'Adicionar horário',
  removeTime: (index) => `Remover o horário ${index + 1}`,
  intervalDays: 'A cada quantos dias',
  intervalHelper: '1 é todo dia; 2 é dia sim, dia não.',
  startDate: 'Início',
  endDate: 'Fim',
  endDateHelper: 'Em branco para uso contínuo.',
  reminders: 'Lembretes nos horários',
  remindersHelper:
    'A equipe vinculada ao paciente recebe um lembrete em cada horário.',
  notes: 'Observação',
  cancel: 'Cancelar',
  save: 'Salvar',
  invalidFields: 'Revise os campos destacados antes de salvar.',
  unexpected: 'Não foi possível salvar agora. Tente de novo em instantes.',
  errors: {
    MEDICATION_PATIENT_INACTIVE:
      'O paciente está inativo. Reative-o antes de cadastrar ou alterar medicamentos.',
    MEDICATION_INACTIVE:
      'O medicamento foi inativado. Reative-o antes de editar.',
    MEDICATION_NOTHING_TO_UPDATE: 'Nenhuma alteração para salvar.',
  },
};

// Mensagem por campo e por código das regras da API (`medicationFields.js`).
export const medicationFieldErrors = {
  name: {
    MAX_LENGTH: 'Use no máximo 200 caracteres.',
    default: 'Informe o nome do medicamento.',
  },
  doseAmount: {
    IS_POSITIVE: 'A dose deve ser maior que zero.',
    MAX: 'A dose informada é grande demais.',
    default: 'Informe a dose como número, com até 3 casas decimais.',
  },
  doseUnit: { default: 'Escolha a unidade da dose.' },
  route: { default: 'Escolha uma via da lista.' },
  notes: {
    MAX_LENGTH: 'Use no máximo 2000 caracteres.',
    default: 'A observação não pode ficar em branco.',
  },
  startDate: {
    default:
      'Informe uma data de início a partir de 01/01/2000 e até um ano à frente.',
  },
  endDate: {
    default: 'O fim não pode ser antes do início nem depois de 31/12/2100.',
  },
  intervalDays: { default: 'Informe um número inteiro de 1 a 30 dias.' },
  times: {
    ARRAY_MIN_SIZE: 'Informe ao menos um horário.',
    ARRAY_MAX_SIZE: 'Informe no máximo 24 horários.',
    ARRAY_UNIQUE: 'Os horários não podem se repetir.',
    default: 'Informe cada horário no formato HH:mm.',
  },
  remindersEnabled: { default: 'Informe se os lembretes ficam ligados.' },
};

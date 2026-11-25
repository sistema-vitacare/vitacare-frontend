// Textos da tela de alertas do paciente (menu Alertas) e do detalhe de um
// alerta. Datas chegam já formatadas pela tela.

export const alertSourceLabels = {
  reading: 'Valor registrado',
  absence: 'Ausência de registro',
  medication_reminder: 'Lembrete de medicamento',
};

export const alertStatusLabels = { open: 'Aberto', resolved: 'Resolvido' };

/** Operador da regra, como a API escreve na mensagem do alerta. */
export const alertOperatorLabels = {
  gt: 'maior que',
  gte: 'maior ou igual a',
  lt: 'menor que',
  lte: 'menor ou igual a',
};

export const frequencyUnitNames = {
  hours: { one: 'hora', many: 'horas' },
  days: { one: 'dia', many: 'dias' },
  weeks: { one: 'semana', many: 'semanas' },
};

export const alertListContent = {
  title: 'Alertas',
  subtitle:
    'Alertas e lembretes dos pacientes que você acompanha, por prioridade.',
  picker: {
    patient: 'Paciente',
    patientPlaceholder: 'Todos os pacientes',
    noPatients: 'Nenhum paciente ativo encontrado',
    openPatient: 'Abrir o paciente',
  },
  countersLabel: 'Alertas abertos por severidade',
  tabsLabel: 'Situação e severidade dos alertas',
  listLabel: 'Alertas',
  tabs: {
    open: 'Todos',
    critical: 'Crítico',
    warning: 'Atenção',
    info: 'Informativo',
    resolved: 'Resolvidos',
  },
  tabLabel: (label, count) => `${label} (${count})`,
  empty: {
    open: 'Nenhum alerta aberto.',
    critical: 'Nenhum alerta crítico aberto.',
    warning: 'Nenhum alerta de atenção aberto.',
    info: 'Nenhum alerta informativo aberto.',
    resolved: 'Nenhum alerta resolvido.',
  },
  patient: (name, condition) => (condition ? `${name} · ${condition}` : name),
  recordedBy: (name) => `Registrado por ${name}`,
  resolvedBy: (name, dateTime) => `Resolvido por ${name} em ${dateTime}`,
  view: 'Ver detalhe',
  viewOf: (title) => `Ver o detalhe de ${title}`,
  resolved: 'Alerta resolvido para toda a equipe.',
  alreadyResolved: 'Outra pessoa já tinha resolvido este alerta.',
  readAll: 'Marcar todos como lidos',
  allRead: (updated) =>
    updated === 1
      ? '1 notificação marcada como lida.'
      : `${updated} notificações marcadas como lidas.`,
  readAllFailed:
    'Não foi possível marcar as notificações agora. Tente de novo em instantes.',
};

export const alertDetailContent = {
  notFound: 'Alerta não encontrado ou sem acesso.',
  notFoundText:
    'O alerta não existe ou é de um paciente que não está vinculado ao seu usuário.',
  backToAlerts: 'Voltar aos alertas',
  summary: {
    title: 'Resumo',
    patient: 'Paciente',
    severity: 'Severidade',
    status: 'Situação',
    source: 'Origem',
    generatedAt: 'Gerado em',
    message: 'Mensagem',
    resolution: 'Resolução',
  },
  reading: {
    title: 'Valor registrado',
    field: 'Campo',
    value: 'Valor registrado',
    rule: 'Regra',
    condition: 'Condição da regra',
    followUp: 'Registro de origem',
    author: 'Registrado por',
    visit: (dateTime) => `Visita de ${dateTime}`,
    annulled: 'Registro anulado depois do alerta',
  },
  absence: {
    title: 'Prazo do formulário',
    form: 'Formulário',
    since: 'Sem registro desde',
    dueAt: 'Prazo vencido em',
    frequency: 'Frequência esperada',
    every: (interval, unit) => `A cada ${interval} ${unit}`,
  },
  reminder: {
    title: 'Agenda do medicamento',
    medication: 'Medicamento',
    scheduledAt: 'Horário programado',
    openMedications: 'Ver os medicamentos do paciente',
  },
};

export const resolveAlertContent = {
  resolve: 'Resolver',
  resolveOf: (title) => `Resolver ${title}`,
  dialog: {
    title: 'Resolver o alerta?',
    text: 'O alerta fica resolvido para toda a equipe e não volta a ficar aberto. A resolução registra quem resolveu e quando.',
    confirm: 'Resolver',
  },
  unexpected: 'Não foi possível resolver agora. Tente de novo em instantes.',
};

export const notificationBellContent = {
  open: (unread) =>
    unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações',
  title: 'Notificações',
  listLabel: 'Notificações dos alertas',
  unread: 'Não lida',
  readAll: 'Marcar todas como lidas',
  empty: 'Nenhuma notificação.',
  line: (patientName, dateTime) => `${patientName} · ${dateTime}`,
  readAllFailed:
    'Não foi possível marcar as notificações agora. Tente de novo em instantes.',
};

export const patientDetailContent = {
  notFound: 'Paciente não encontrado ou sem acesso.',
  notFoundText:
    'O paciente não existe ou não está vinculado ao seu usuário. Volte à lista para escolher outro.',
  backToList: 'Voltar à lista de pacientes',
  actions: {
    visit: 'Registrar visita',
    history: 'Histórico e evolução',
    medications: 'Medicamentos',
    report: 'Relatório',
    edit: 'Editar',
    deactivate: 'Inativar',
    reactivate: 'Reativar',
  },
  summary: {
    years: (age) => `${age} anos`,
    yourLink: 'Seu vínculo',
    noConditions: 'Sem condição informada',
  },
  registration: {
    title: 'Dados cadastrais',
    empty: 'Não informado',
  },
  counts: {
    validFollowUps: 'Registros válidos',
    openAlerts: 'Alertas abertos',
    activeMedications: 'Medicamentos ativos',
    lastVisitedAt: 'Última visita',
    never: 'Nenhuma',
  },
  measurements: {
    title: 'Últimas medições',
    subtitle:
      'Até cinco valores por parâmetro, do mais recente ao mais antigo.',
    parameter: 'Parâmetro',
    latest: 'Último',
    previous: 'Anteriores',
    empty:
      'Ainda não há registros de acompanhamento. Os valores aparecem aqui depois da primeira visita registrada pelo cuidador.',
  },
  medications: {
    title: 'Medicamentos ativos',
    empty: 'Nenhum medicamento ativo.',
    times: (times) => times.join(' e '),
  },
  alerts: {
    title: 'Alertas recentes',
    empty: 'Nenhum alerta para este paciente.',
    resolved: 'Resolvido',
    open: 'Aberto',
    viewAll: 'Ver alertas',
  },
  deactivateDialog: {
    title: 'Inativar paciente?',
    text: 'O paciente sai da listagem principal e libera a vaga do plano. Cadastro, vínculos e histórico ficam preservados, e ele pode ser reativado depois.',
    confirm: 'Inativar paciente',
  },
  reactivateDialog: {
    title: 'Reativar paciente?',
    text: 'O paciente volta à listagem principal e ocupa de novo uma vaga do plano.',
    confirm: 'Reativar paciente',
  },
  statusErrors: {
    PATIENT_PLAN_LIMIT_REACHED:
      'O plano atingiu o limite de pacientes ativos. Inative outro paciente ou peça a mudança de plano.',
    PATIENT_PLAN_EXPIRED:
      'A vigência do plano venceu. A reativação fica bloqueada até a renovação.',
    unexpected: 'Não foi possível concluir agora. Tente de novo.',
  },
};

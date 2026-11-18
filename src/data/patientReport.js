// Textos do relatório do paciente (FE-24, UC10, Figura 43).

export const patientReportContent = {
  picker: {
    patient: 'Paciente',
    patientPlaceholder: 'Busque pelo nome',
    choosePatient: 'Escolha um paciente para gerar o relatório.',
    noPatients: 'Nenhum paciente ativo encontrado',
    openPatient: 'Abrir o paciente',
  },
  title: 'Relatório do paciente',
  period: (from, to) => `Período de ${from} a ${to}`,
  generated: (when, by) => `Gerado em ${when} por ${by}`,
  exportPdf: 'Exportar PDF',
  exportError: 'Não foi possível exportar o PDF.',
  retry: 'Tentar de novo',
  identification: {
    title: 'Identificação',
    birthDate: 'Nascimento',
    sex: 'Sexo',
    mainCondition: 'Condição principal',
    secondaryConditions: 'Outras condições',
    responsible: 'Responsável',
    status: 'Situação',
    organization: 'Organização',
    none: 'Não informado',
  },
  summary: {
    title: 'Resumo',
    total: 'Registros no período',
    first: 'Primeira visita',
    last: 'Última visita',
    byForm: 'Por formulário',
    byAuthor: 'Por autor',
    count: (name, total) => `${name}: ${total}`,
    none: 'Sem visitas no período',
  },
  evolution: {
    title: 'Evolução',
    empty: 'Sem medições numéricas no período.',
  },
  records: {
    title: 'Registros',
    empty: 'Nenhum registro no período.',
    by: 'por',
    annulled: 'Anulado',
  },
  medications: {
    title: 'Medicamentos ativos',
    empty: 'Nenhum medicamento ativo.',
  },
};

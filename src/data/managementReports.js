// Textos da página de relatórios e dos relatórios gerenciais (FE-38,
// Figura 43). Nome e descrição de cada tipo vêm da API.

const count = (total, singular, plural) =>
  `${total} ${total === 1 ? singular : plural}`;

export const reportsPageContent = {
  title: 'Relatórios',
  typesLabel: 'Tipos de relatório',
  exported: (count) => `${count} ${count === 1 ? 'gerado' : 'gerados'}`,
};

export const managementFiltersContent = {
  condition: 'Condição',
  conditionPlaceholder: 'Ex.: diabetes',
  conditionHelper: 'Trecho da condição principal ou das secundárias.',
};

export const managementReportContent = {
  period: (from, to) => `Período de ${from} a ${to}`,
  condition: (condition) =>
    condition ? `Condição: ${condition}` : 'Todos os pacientes',
  exportPdf: 'Exportar PDF',
  exportError: 'Não foi possível exportar o PDF.',
  retry: 'Tentar de novo',
};

export const alertsReportContent = {
  totals: {
    issued: 'Emitidos',
    open: 'Abertos',
    resolved: 'Resolvidos',
    intercurrences: 'Intercorrências',
  },
  totalsLabel: 'Totais do período',
  breakdownTitle: 'Por origem e severidade',
  columns: {
    group: 'Grupo',
    total: 'Total',
    open: 'Abertos',
    resolved: 'Resolvidos',
  },
  resolutionTitle: 'Tempo até a resolução',
  resolution: (resolved, average, median) =>
    resolved === 0
      ? 'Nenhum alerta resolvido no período.'
      : `${count(resolved, 'resolvido', 'resolvidos')} · média de ${average} h · mediana de ${median} h`,
  byDayTitle: 'Alertas por dia',
  byDaySeries: 'Alertas',
  topPatientsTitle: 'Pacientes com mais alertas',
  topPatient: (total, intercurrences, open) =>
    [
      count(total, 'alerta', 'alertas'),
      count(intercurrences, 'intercorrência', 'intercorrências'),
      count(open, 'aberto', 'abertos'),
    ].join(' · '),
  inactive: 'Inativo',
  intercurrencesTitle: 'Intercorrências',
  truncated: (total) =>
    `Mostrando as 200 mais recentes de ${total} intercorrências.`,
  noIntercurrences: 'Nenhuma intercorrência no período.',
  open: 'Aberta',
  resolvedIn: (hours) => `Resolvida em ${hours} h`,
};

export const caregiversReportContent = {
  summaryLabel: 'Resumo do período',
  summary: {
    caregivers: 'Cuidadores',
    linkedPatients: 'Pacientes vinculados',
    validFollowUps: 'Registros válidos',
    annulledFollowUps: 'Registros anulados',
    absenceAlerts: 'Alertas de ausência',
    resolvedAlerts: 'Alertas resolvidos',
  },
  columns: {
    caregiver: 'Cuidador',
    linkedPatients: 'Vínculos',
    validFollowUps: 'Registros válidos',
    annulledFollowUps: 'Anulados',
    patientsWithFollowUp: 'Pacientes com registro',
    patientsWithoutFollowUp: 'Sem registro',
    absenceAlerts: 'Ausências',
    resolvedAlerts: 'Resolvidos',
  },
  inactive: 'Inativo',
  noRanking:
    'Os números mostram a atividade de cada cuidador, sem nota nem classificação de desempenho.',
};

export const recentReportsContent = {
  title: 'Relatórios recentes',
  scope: {
    patient: (name) => name ?? 'Paciente',
    condition: (condition) => `Condição: ${condition}`,
    all: 'Todos os pacientes',
  },
  period: (from, to) => `${from} a ${to}`,
  generated: (by, when) => `${by ?? 'Usuário removido'} · ${when}`,
  again: 'Gerar de novo',
};

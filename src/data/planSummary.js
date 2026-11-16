// Textos do resumo do plano, comum às Configurações (FE-26) e à página da
// organização na plataforma (FE-28).

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

export const planSummaryContent = {
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
};

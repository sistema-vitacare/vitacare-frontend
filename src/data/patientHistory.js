export const patientHistoryContent = {
  title: 'Histórico e evolução',
  readOnly:
    'Você está no modo de leitura. Nenhuma alteração pode ser feita por este perfil.',
  evolution: {
    title: 'Evolução',
    period: (from, to) => `De ${from} a ${to}`,
    defaultPeriod:
      'Sem período escolhido, a evolução mostra os últimos 30 dias.',
    empty: 'Nenhuma medição no período.',
  },
  notFound: 'Paciente não encontrado ou sem acesso.',
  backToList: 'Voltar à lista de pacientes',
};

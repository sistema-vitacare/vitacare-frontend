export const patientListContent = {
  title: 'Pacientes',
  subtitle: (total, status) =>
    `${total} ${total === 1 ? 'paciente' : 'pacientes'} ${
      status === 'inactive' ? 'inativos' : 'ativos'
    }`,
  newPatient: 'Novo paciente',
  searchLabel: 'Buscar paciente',
  searchPlaceholder: 'Nome ou CPF',
  conditionLabel: 'Condição',
  conditionPlaceholder: 'Ex.: diabetes',
  statusLabel: 'Situação',
  statusOptions: { active: 'Ativos', inactive: 'Inativos' },
  columns: {
    name: 'Paciente',
    cpf: 'CPF',
    condition: 'Condição',
    responsible: 'Responsável',
    status: 'Situação',
  },
  age: (years) => `${years} anos`,
  moreConditions: (count) => `+${count}`,
  noCpf: 'Sem CPF',
  noCondition: 'Sem condição informada',
  empty: 'Nenhum paciente cadastrado.',
  emptyInactive: 'Nenhum paciente inativo.',
  noResults: 'Nenhum paciente encontrado para os filtros aplicados.',
  range: (first, last, total) => `Mostrando ${first}–${last} de ${total}`,
  paginationLabel: 'Páginas da lista de pacientes',
};

export const topBarSearchContent = {
  label: 'Buscar paciente',
  placeholder: 'Buscar paciente',
};

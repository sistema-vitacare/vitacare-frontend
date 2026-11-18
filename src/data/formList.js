export const formListContent = {
  title: 'Formulários',
  subtitle: 'Modelos de registro de acompanhamento dos pacientes.',
  newForm: 'Novo formulário',
  searchLabel: 'Buscar formulário pelo nome',
  searchButton: 'Buscar',
  statusLabel: 'Situação',
  allStatuses: 'Todas',
  listLabel: 'Formulários de acompanhamento',
  count: (total) => `${total} ${total === 1 ? 'formulário' : 'formulários'}`,
  empty: 'Nenhum formulário cadastrado.',
  noResults: 'Nenhum formulário com esses filtros.',
  pendingDraft: 'Rascunho pendente',
  version: (number) => `Versão ${number}`,
  neverPublished: 'Ainda não publicado',
  fieldCount: (count) => `${count} ${count === 1 ? 'campo' : 'campos'}`,
  patients: (count) =>
    `${count} ${count === 1 ? 'paciente selecionado' : 'pacientes selecionados'}`,
  paginationLabel: 'Páginas dos formulários',
  readOnly:
    'Você vê os formulários ativos que valem para os seus pacientes, sem poder alterá-los.',
};

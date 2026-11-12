// Textos da lista de registros de acompanhamento e dos filtros, usados no
// histórico do paciente e na tela de registros.
export const followUpRecordsContent = {
  filters: {
    from: 'De',
    to: 'Até',
    form: 'Formulário',
    author: 'Responsável pelo registro',
    all: 'Todos',
    clear: 'Limpar filtros',
  },
  list: {
    title: 'Registros de acompanhamento',
    count: (total) => `${total} ${total === 1 ? 'registro' : 'registros'}`,
    empty: 'Nenhum registro de acompanhamento para este paciente.',
    noResults: 'Nenhum registro no período e nos filtros escolhidos.',
    annulled: 'Anulado',
    annulledBy: (name, date) => `Anulado por ${name} em ${date}.`,
    reason: 'Motivo',
    notes: 'Observações',
    by: 'por',
    open: (date) => `Abrir o registro de ${date}`,
    paginationLabel: 'Páginas dos registros',
  },
  answers: { yes: 'Sim', no: 'Não' },
};

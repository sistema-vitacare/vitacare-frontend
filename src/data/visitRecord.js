export const visitRecordContent = {
  title: 'Registrar visita',
  notFound: 'Paciente não encontrado ou sem acesso.',
  backToList: 'Voltar à lista de pacientes',
  inactive:
    'Paciente inativo não recebe registro. Reative o cadastro para registrar visitas.',
  noForms:
    'Nenhum formulário ativo vale para este paciente. Peça ao profissional responsável para publicar um formulário.',
  backToPatient: 'Voltar ao paciente',
  form: 'Formulário',
  chooseForm: 'Escolha o formulário da visita',
  visitedAt: 'Data e hora da visita',
  visitedAtHelper: 'Use a hora em que a visita aconteceu.',
  notes: 'Observações da visita',
  notesHelper: 'Até 2.000 caracteres.',
  noSection: 'Outros',
  required: 'obrigatório',
  notInformed: 'Não informado',
  clear: (name) => `Limpar ${name}`,
  clearLabel: 'Limpar',
  yes: 'Sim',
  no: 'Não',
  cancel: 'Cancelar',
  save: 'Salvar registro',
  errors: {
    empty: 'Preencha ao menos um campo do formulário antes de salvar.',
    future: 'A visita não pode estar no futuro.',
    invalid: 'Revise os campos indicados.',
    notesTooLong: 'Use no máximo 2.000 caracteres.',
    outdated:
      'O formulário mudou desde que foi aberto. Abra de novo e preencha a versão atual.',
    reload: 'Abrir de novo',
    FORM_INACTIVE: 'O formulário foi desativado e não recebe novos registros.',
    FOLLOW_UP_PATIENT_INACTIVE: 'Paciente inativo não recebe registro.',
    FOLLOW_UP_FORM_NOT_APPLICABLE: 'Este formulário não vale para o paciente.',
    unexpected: 'Não foi possível salvar o registro. Tente novamente.',
  },
  fieldErrors: {
    REQUIRED: 'Campo obrigatório.',
    NOT_A_NUMBER: 'Informe um número.',
    TOO_MANY_DECIMALS: (places) =>
      places === 0
        ? 'Informe um número inteiro.'
        : `Use no máximo ${places} ${places === 1 ? 'casa decimal' : 'casas decimais'}.`,
    OUT_OF_SCALE: 'Valor fora da escala.',
    TOO_LONG: 'Use no máximo 2.000 caracteres.',
    fallback: 'Revise este valor.',
  },
};

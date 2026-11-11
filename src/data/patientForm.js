export const patientFormContent = {
  newTitle: 'Novo paciente',
  newSubtitle:
    'Preencha os dados cadastrais. Só nome, nascimento e responsável são obrigatórios.',
  editTitle: 'Editar paciente',
  editSubtitle: 'Altere os dados e salve.',
  sections: {
    personal: 'Dados pessoais',
    address: 'Endereço',
    clinical: 'Informações clínicas',
  },
  sexNotInformed: 'Não informado',
  stateNotInformed: 'Não informada',
  secondaryHelper:
    'Digite e pressione Enter para incluir cada condição. Até 20.',
  responsibleHelper: 'Profissional ou administrador que acompanha o paciente.',
  pendingInvitation: 'convite pendente',
  cancel: 'Cancelar',
  save: 'Salvar paciente',
  invalidFields: 'Revise os campos destacados antes de salvar.',
  duplicateCpf:
    'Já existe um paciente com este CPF na organização. Busque o cadastro existente; se ele estiver inativo, reative-o no detalhe do paciente.',
  searchActive: 'Buscar entre os ativos',
  searchInactive: 'Buscar entre os inativos',
  planLimitReached:
    'O plano da organização atingiu o limite de pacientes ativos. Inative um paciente ou peça ao administrador a mudança de plano.',
  planExpired:
    'A vigência do plano da organização venceu. O cadastro fica bloqueado até a renovação, feita pelo administrador.',
  inactive:
    'Este paciente está inativo e não pode ser editado. Reative-o no detalhe para editar.',
  backToDetail: 'Voltar ao paciente',
  notFound: 'Paciente não encontrado ou sem acesso.',
  unexpected: 'Não foi possível salvar agora. Tente de novo em instantes.',
};

// Mensagem por campo e por código de erro de `validatePatient` e da API.
export const patientFieldErrors = {
  name: {
    required: 'Informe o nome completo.',
    tooLong: 'Use no máximo 180 caracteres.',
    invalid: 'Nome inválido.',
  },
  birthDate: {
    required: 'Informe a data de nascimento.',
    invalid: 'Informe uma data válida.',
    futureDate: 'A data de nascimento não pode ser futura.',
    tooOld: 'A data de nascimento precisa ser a partir de 01/01/1900.',
  },
  cpf: {
    invalid: 'CPF inválido. Confira os 11 dígitos.',
    duplicate: 'CPF já cadastrado na organização.',
  },
  phone: { invalid: 'Use só números, espaço, +, parênteses e hífen.' },
  email: {
    invalid: 'Informe um e-mail válido.',
    tooLong: 'Use no máximo 254 caracteres.',
  },
  zipCode: { invalid: 'O CEP tem 8 dígitos.' },
  street: {
    tooLong: 'Use no máximo 180 caracteres.',
    invalid: 'Logradouro inválido.',
  },
  number: {
    tooLong: 'Use no máximo 20 caracteres.',
    invalid: 'Número inválido.',
  },
  complement: {
    tooLong: 'Use no máximo 120 caracteres.',
    invalid: 'Complemento inválido.',
  },
  district: {
    tooLong: 'Use no máximo 120 caracteres.',
    invalid: 'Bairro inválido.',
  },
  city: {
    tooLong: 'Use no máximo 120 caracteres.',
    invalid: 'Cidade inválida.',
  },
  state: { invalid: 'Escolha uma das 27 UFs.' },
  mainCondition: {
    tooLong: 'Use no máximo 180 caracteres.',
    invalid: 'Condição inválida.',
  },
  secondaryConditions: {
    tooMany: 'Informe no máximo 20 condições.',
    tooLong: 'Cada condição tem no máximo 180 caracteres.',
    invalid: 'Condição inválida.',
  },
  healthPlan: {
    tooLong: 'Use no máximo 180 caracteres.',
    invalid: 'Plano inválido.',
  },
  notes: {
    tooLong: 'Use no máximo 2000 caracteres.',
    invalid: 'Observação inválida.',
  },
  sex: { invalid: 'Escolha uma opção.' },
  responsibleUserId: {
    required: 'Escolha o profissional responsável.',
    invalid: 'Escolha um profissional ou administrador ativo.',
  },
};

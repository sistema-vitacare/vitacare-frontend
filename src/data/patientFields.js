// Rótulos comuns às telas de pacientes: campos, valores fechados da API e
// mensagens de validação do cadastro.

export const patientStatusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export const sexLabels = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
};

export const patientFieldLabels = {
  name: 'Nome completo',
  birthDate: 'Data de nascimento',
  sex: 'Sexo',
  cpf: 'CPF',
  phone: 'Telefone',
  email: 'E-mail',
  zipCode: 'CEP',
  street: 'Logradouro',
  number: 'Número',
  complement: 'Complemento',
  district: 'Bairro',
  city: 'Cidade',
  state: 'UF',
  mainCondition: 'Condição principal',
  secondaryConditions: 'Condições secundárias',
  healthPlan: 'Plano de saúde',
  notes: 'Observações',
  responsibleUserId: 'Profissional responsável',
  responsible: 'Responsável',
  age: 'Idade',
  status: 'Situação',
};

/** Texto no lugar de um campo que a API oculta para o familiar. */
export const maskedFieldText = 'Não exibido para o seu perfil';

export const doseUnitLabels = {
  mg: 'mg',
  mcg: 'mcg',
  g: 'g',
  ml: 'ml',
  iu: 'UI',
  drops: 'gotas',
  tablet: 'comprimido',
  capsule: 'cápsula',
  application: 'aplicação',
};

export const severityLabels = {
  critical: 'Crítico',
  warning: 'Atenção',
  info: 'Informativo',
};

export const resourceStateContent = {
  error: 'Não foi possível carregar os dados.',
  retry: 'Tentar de novo',
};

export const confirmDialogContent = {
  cancel: 'Cancelar',
};

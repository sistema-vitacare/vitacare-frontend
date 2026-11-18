// Rótulos dos valores dos formulários de acompanhamento.

export const fieldTypeLabels = {
  number: 'Número',
  scale: 'Escala',
  boolean: 'Sim ou não',
  text: 'Texto',
  single_choice: 'Escolha única',
  multiple_choice: 'Múltipla escolha',
};

export const requirementLabels = {
  required: 'Obrigatório',
  optional: 'Opcional',
  disabled: 'Desabilitado',
};

export const formStatusLabels = {
  draft: 'Rascunho',
  active: 'Ativo',
  inactive: 'Inativo',
};

export const audienceLabels = {
  organization: 'Toda a organização',
  patients: 'Pacientes selecionados',
};

const UNITS = {
  hours: ['hora', 'horas'],
  days: ['dia', 'dias'],
  weeks: ['semana', 'semanas'],
};

export const frequencyUnitLabels = {
  hours: 'Horas',
  days: 'Dias',
  weeks: 'Semanas',
};

/** "A cada 2 dias", ou o texto de sem frequência. */
export function frequencyText(frequency) {
  if (!frequency) {
    return 'Sem frequência esperada';
  }
  const [one, many] = UNITS[frequency.unit];
  return `A cada ${frequency.interval} ${frequency.interval === 1 ? one : many}`;
}

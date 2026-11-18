// Listas fechadas dos formulários de acompanhamento, com os valores da API.

/** Tipos de campo, na ordem em que a tela os oferece. */
export const FIELD_TYPES = Object.freeze([
  'number',
  'scale',
  'boolean',
  'text',
  'single_choice',
  'multiple_choice',
]);

/** Obrigatoriedade de um campo (Figura 39). */
export const REQUIREMENTS = Object.freeze(['required', 'optional', 'disabled']);

export const FREQUENCY_UNITS = Object.freeze(['hours', 'days', 'weeks']);

/** Toda a organização ou só os pacientes da lista. */
export const AUDIENCES = Object.freeze(['organization', 'patients']);

/** Situação do formulário: nunca publicado, com versão vigente ou desativado. */
export const FORM_STATUSES = Object.freeze(['draft', 'active', 'inactive']);

/** Tipos com opções a escolher. */
export const CHOICE_TYPES = Object.freeze(['single_choice', 'multiple_choice']);

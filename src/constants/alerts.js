// Listas fechadas dos alertas e das regras de alerta, com os valores da API
// (`alert.types.ts` do backend).

/** Severidades, da mais à menos urgente; na API, só um rótulo. */
export const ALERT_SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

/** Origem do alerta: valor registrado, ausência de registro ou lembrete. */
export const ALERT_SOURCES = Object.freeze([
  'reading',
  'absence',
  'medication_reminder',
]);

export const ALERT_STATUSES = Object.freeze(['open', 'resolved']);

/** Operadores da regra, sempre contra um único valor de referência. */
export const ALERT_RULE_OPERATORS = Object.freeze(['gt', 'gte', 'lt', 'lte']);

export const ALERT_RULE_STATUSES = Object.freeze(['active', 'inactive']);

/** Tipos de campo que uma regra pode monitorar. */
export const ALERT_RULE_FIELD_TYPES = Object.freeze(['number', 'scale']);

/**
 * Cor do tema de cada severidade (`error.main`, `warning.main`, `info.main`).
 * As cores de estado só indicam situação, nunca decoram.
 */
export const SEVERITY_TONE = Object.freeze({
  critical: 'error',
  warning: 'warning',
  info: 'info',
});

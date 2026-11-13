// Gravidades da auditoria (info, normal, atenção e crítico da Figura 45) e
// origens do evento, com os códigos da API.
export const AUDIT_SEVERITIES = Object.freeze([
  'info',
  'normal',
  'warning',
  'critical',
]);

// `system` reúne os eventos de Sistema/Automação: jobs, avaliação de alertas
// e ações da plataforma registradas na organização alvo.
export const AUDIT_ACTOR_TYPES = Object.freeze(['user', 'system']);

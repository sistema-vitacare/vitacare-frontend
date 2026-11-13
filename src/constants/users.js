// Perfis que uma organização cliente atribui aos usuários, na ordem da API
// (`TENANT_PROFILES` de `access.permissions.ts`); o da plataforma fica fora.
export const TENANT_PROFILES = Object.freeze([
  'admin',
  'professional',
  'caregiver',
  'family',
]);

// `pending` é o convidado que ainda não fez o primeiro acesso.
export const USER_STATUSES = Object.freeze(['active', 'pending', 'inactive']);

// Canais do convite (BE-31): link por e-mail ou senha provisória. Sem
// `channel` no pedido, vale o padrão do servidor, que depende do SMTP.
export const INVITATION_CHANNELS = Object.freeze([
  'email',
  'temporary_password',
]);

// Situações do convite: `invalidated` é o link cancelado, porque o envio
// falhou ou o e-mail mudou; vencido e cancelado pedem nova reemissão.
export const INVITATION_STATUSES = Object.freeze([
  'pending',
  'expired',
  'invalidated',
]);

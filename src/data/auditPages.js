// Textos da auditoria (FE-25, UC06, Figura 45): lista com filtros, detalhe
// do evento e exportação em CSV. Os rótulos das ações vêm do catálogo da API.

/** Gravidade do evento, com os nomes da Figura 45. */
export const auditSeverityLabels = {
  info: 'Informativo',
  normal: 'Normal',
  warning: 'Atenção',
  critical: 'Crítico',
};

export const auditActorTypeLabels = {
  user: 'Usuário',
  system: 'Sistema',
};

// Tipo do item afetado; tipo fora desta lista aparece com o código da API.
export const auditEntityLabels = {
  patient: 'Paciente',
  user: 'Usuário',
  follow_up_form: 'Formulário',
  follow_up_record: 'Registro',
  follow_up_attachment: 'Anexo',
  alert: 'Alerta',
  medication: 'Medicamento',
  organization: 'Organização',
  organization_plan_term: 'Plano da organização',
  audit_events: 'Auditoria',
};

// Chaves dos valores gravados que aparecem nos eventos (manual
// `audit-events-detalhe.md` e eventos simulados, conferidos em 13/11/2026);
// chave fora desta lista aparece como a API grava.
export const auditValueLabels = {
  changedFields: 'Campos alterados',
  fields: 'Campos',
  reason: 'Motivo',
  reasonLength: 'Tamanho do motivo',
  severity: 'Severidade',
  source: 'Origem',
  status: 'Situação',
  fromStatus: 'Situação anterior',
  profile: 'Perfil',
  fromProfile: 'Perfil anterior',
  toProfile: 'Perfil novo',
  from: 'De',
  to: 'Até',
  type: 'Tipo de relatório',
  format: 'Formato',
  condition: 'Condição',
  total: 'Total',
  formId: 'Formulário (id)',
  formVersionId: 'Versão do formulário (id)',
  versionNumber: 'Número da versão',
  impactConfirmed: 'Impacto confirmado',
  itemCount: 'Respostas',
  patientId: 'Paciente (id)',
  followUpId: 'Registro (id)',
  fileName: 'Arquivo',
  contentType: 'Tipo do arquivo',
  sizeBytes: 'Tamanho (bytes)',
  ownRecord: 'Registro próprio',
  milestone: 'Marco',
  recipients: 'Destinatários',
  platformActorUserId: 'Administrador da plataforma (id)',
};

export const auditListContent = {
  title: 'Auditoria',
  subtitle: (total) => `${total} ${total === 1 ? 'evento' : 'eventos'}`,
  filtersLabel: 'Filtros da auditoria',
  searchLabel: 'Buscar',
  searchPlaceholder: 'Nome de quem fez ou ação',
  actionLabel: 'Ação',
  allActions: 'Todas as ações',
  severityLabel: 'Gravidade',
  allSeverities: 'Todas as gravidades',
  actorTypeLabel: 'Origem',
  allActorTypes: 'Todas as origens',
  organizationLabel: 'Organização',
  allOrganizations: 'Todas as organizações',
  columns: {
    occurredAt: 'Data e hora',
    organization: 'Organização',
    actor: 'Responsável',
    profile: 'Perfil no momento',
    action: 'Ação',
    entity: 'Item',
    ip: 'IP',
    severity: 'Gravidade',
  },
  system: 'Sistema',
  none: '—',
  exportCsv: 'Exportar CSV',
  exportError: 'Não foi possível exportar o CSV.',
  // Sem `meta.message`, como na falha da lista; a API manda a mensagem.
  empty: 'Nenhum evento de auditoria para os filtros selecionados.',
  range: (first, last, total) => `Mostrando ${first}–${last} de ${total}`,
  paginationLabel: 'Páginas da auditoria',
};

export const auditEventContent = {
  eventTitle: 'Evento',
  fields: {
    occurredAt: 'Data e hora',
    organization: 'Organização',
    actor: 'Responsável',
    profile: 'Perfil no momento',
    action: 'Ação',
    severity: 'Gravidade',
    entity: 'Item',
    ip: 'IP',
    requestId: 'Request id',
  },
  beforeTitle: 'Valores anteriores',
  afterTitle: 'Valores gravados',
  noValues: 'Nenhum valor gravado neste evento.',
  yes: 'Sim',
  no: 'Não',
  notFound: 'Evento não encontrado ou sem acesso.',
  notFoundText:
    'O evento não existe ou é de outra organização, que a sua sessão não alcança.',
  backToAudit: 'Voltar à auditoria',
};

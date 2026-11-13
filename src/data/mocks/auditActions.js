// Catálogo de ações da auditoria, no formato de GET /audit-events/actions,
// copiado de `auditCatalog.policy.ts` do backend (67 ações, conferido em
// 13/11/2026). A ordem é a do seletor "Ação" da Figura 45. Gravidade nula:
// ela vem do próprio evento, como a severidade do alerta gerado.
export const auditActions = [
  {
    action: 'auth.login_succeeded',
    label: 'Entrou no sistema',
    severity: 'normal',
  },
  {
    action: 'auth.login_failed',
    label: 'Tentativa de acesso recusada',
    severity: 'warning',
  },
  {
    action: 'auth.first_access_started',
    label: 'Iniciou o primeiro acesso',
    severity: 'normal',
  },
  {
    action: 'auth.first_access_completed',
    label: 'Concluiu o primeiro acesso',
    severity: 'normal',
  },
  { action: 'auth.logout', label: 'Saiu do sistema', severity: 'normal' },
  {
    action: 'auth.password_changed',
    label: 'Trocou a própria senha',
    severity: 'normal',
  },
  {
    action: 'auth.password_recovered',
    label: 'Redefiniu a senha pela recuperação',
    severity: 'normal',
  },
  {
    action: 'auth.admin_password_reset',
    label: 'Emitiu senha temporária',
    severity: 'warning',
  },
  {
    action: 'auth.bootstrap_completed',
    label: 'Concluiu a configuração inicial',
    severity: 'normal',
  },
  {
    action: 'organization.platform_seeded',
    label: 'Criou a plataforma',
    severity: 'info',
  },
  {
    action: 'organization.created',
    label: 'Cadastrou organização',
    severity: 'normal',
  },
  {
    action: 'organization.updated',
    label: 'Editou organização',
    severity: 'normal',
  },
  {
    action: 'organization.deactivated',
    label: 'Inativou organização',
    severity: 'warning',
  },
  {
    action: 'organization.reactivated',
    label: 'Reativou organização',
    severity: 'normal',
  },
  { action: 'plan.assigned', label: 'Atribuiu plano', severity: 'warning' },
  {
    action: 'plan_expiry_notice.generated',
    label: 'Gerou aviso de vencimento do plano',
    severity: 'warning',
  },
  {
    action: 'plan_change_request.created',
    label: 'Solicitou mudança de plano',
    severity: 'normal',
  },
  {
    action: 'plan_change_request.cancelled',
    label: 'Cancelou solicitação de plano',
    severity: 'normal',
  },
  {
    action: 'plan_change_request.approved',
    label: 'Aprovou solicitação de plano',
    severity: 'warning',
  },
  {
    action: 'plan_change_request.rejected',
    label: 'Recusou solicitação de plano',
    severity: 'warning',
  },
  { action: 'user.created', label: 'Cadastrou usuário', severity: 'normal' },
  { action: 'user.updated', label: 'Editou usuário', severity: 'normal' },
  {
    action: 'user.profile_changed',
    label: 'Alterou perfil de usuário',
    severity: 'warning',
  },
  {
    action: 'user.invitation_reissued',
    label: 'Reemitiu convite de usuário',
    severity: 'normal',
  },
  {
    action: 'user.invitation_sent',
    label: 'Enviou convite por e-mail',
    severity: 'info',
  },
  {
    action: 'user.invitation_failed',
    label: 'Falhou ao enviar convite por e-mail',
    severity: 'warning',
  },
  {
    action: 'user.invitation_accepted',
    label: 'Aceitou o convite e cadastrou a senha',
    severity: 'info',
  },
  {
    action: 'user.deactivated',
    label: 'Inativou usuário',
    severity: 'warning',
  },
  { action: 'user.reactivated', label: 'Reativou usuário', severity: 'normal' },
  {
    action: 'profile.updated',
    label: 'Editou o próprio cadastro',
    severity: 'info',
  },
  {
    action: 'profile.email_changed',
    label: 'Trocou o próprio e-mail',
    severity: 'warning',
  },
  {
    action: 'terms.accepted',
    label: 'Aceitou o termo de uso',
    severity: 'normal',
  },
  {
    action: 'patient.created',
    label: 'Cadastrou paciente',
    severity: 'normal',
  },
  { action: 'patient.updated', label: 'Editou paciente', severity: 'normal' },
  {
    action: 'patient.responsible_changed',
    label: 'Trocou o profissional responsável',
    severity: 'normal',
  },
  {
    action: 'patient.deactivated',
    label: 'Inativou paciente',
    severity: 'warning',
  },
  {
    action: 'patient.reactivated',
    label: 'Reativou paciente',
    severity: 'normal',
  },
  {
    action: 'patient_link.created',
    label: 'Vinculou usuário ao paciente',
    severity: 'normal',
  },
  {
    action: 'patient_link.updated',
    label: 'Editou vínculo com paciente',
    severity: 'normal',
  },
  {
    action: 'patient_link.revoked',
    label: 'Revogou vínculo com paciente',
    severity: 'warning',
  },
  { action: 'form.created', label: 'Criou formulário', severity: 'normal' },
  { action: 'form.updated', label: 'Editou formulário', severity: 'normal' },
  {
    action: 'form.draft_saved',
    label: 'Salvou rascunho de formulário',
    severity: 'normal',
  },
  {
    action: 'form.draft_discarded',
    label: 'Descartou rascunho de formulário',
    severity: 'normal',
  },
  {
    action: 'form.published',
    label: 'Publicou formulário',
    severity: 'normal',
  },
  {
    action: 'form.deactivated',
    label: 'Inativou formulário',
    severity: 'warning',
  },
  {
    action: 'form.reactivated',
    label: 'Reativou formulário',
    severity: 'normal',
  },
  {
    action: 'follow_up.created',
    label: 'Registrou acompanhamento',
    severity: 'normal',
  },
  {
    action: 'follow_up.annulled',
    label: 'Anulou registro de acompanhamento',
    severity: 'warning',
  },
  {
    action: 'follow_up_attachment.created',
    label: 'Anexou arquivo ao registro',
    severity: 'normal',
  },
  {
    action: 'follow_up_attachment.removed',
    label: 'Removeu anexo do registro',
    severity: 'warning',
  },
  {
    action: 'medication.created',
    label: 'Cadastrou medicamento',
    severity: 'normal',
  },
  {
    action: 'medication.updated',
    label: 'Editou medicamento',
    severity: 'normal',
  },
  {
    action: 'medication.deactivated',
    label: 'Inativou medicamento',
    severity: 'warning',
  },
  {
    action: 'medication.reactivated',
    label: 'Reativou medicamento',
    severity: 'normal',
  },
  {
    action: 'alert_rule.created',
    label: 'Criou regra de alerta',
    severity: 'normal',
  },
  {
    action: 'alert_rule.updated',
    label: 'Editou regra de alerta',
    severity: 'normal',
  },
  {
    action: 'alert_rule.deactivated',
    label: 'Inativou regra de alerta',
    severity: 'warning',
  },
  {
    action: 'alert_rule.reactivated',
    label: 'Reativou regra de alerta',
    severity: 'normal',
  },
  { action: 'alert.generated', label: 'Gerou alerta', severity: null },
  { action: 'alert.resolved', label: 'Resolveu alerta', severity: 'normal' },
  {
    action: 'notification_preferences.updated',
    label: 'Alterou preferências de notificação',
    severity: 'info',
  },
  {
    action: 'push_subscription.created',
    label: 'Ativou notificações no navegador',
    severity: 'info',
  },
  {
    action: 'push_subscription.revoked',
    label: 'Desativou notificações no navegador',
    severity: 'info',
  },
  {
    action: 'patient_report.exported',
    label: 'Exportou relatório do paciente',
    severity: 'warning',
  },
  {
    action: 'management_report.exported',
    label: 'Exportou relatório gerencial',
    severity: 'warning',
  },
  {
    action: 'audit_events.exported',
    label: 'Exportou a auditoria',
    severity: 'warning',
  },
];

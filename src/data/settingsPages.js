// Textos das configurações (FE-26, UC04, Figura 46): dados da organização,
// plano e uso e solicitação de mudança de plano. Os rótulos e as mensagens
// dos campos da organização ficam em `organizationFields.js`, e os do resumo
// do plano, em `planSummary.js`.

export const settingsContent = {
  title: 'Configurações',
  none: '—',
};

export const organizationSectionContent = {
  title: 'Organização',
  edit: 'Editar',
  saved: 'Dados da organização salvos.',
};

export const planSectionContent = {
  title: 'Plano e uso',
  request: 'Solicitar mudança de plano',
  pendingTitle: 'Solicitação em análise',
  pending: (from, to, when) => `${from} → ${to}, pedida em ${when}`,
  notes: (text) => `Observação: ${text}`,
  cancel: 'Cancelar solicitação',
  cancelTitle: 'Cancelar a solicitação?',
  cancelText:
    'A solicitação sai da análise da plataforma, e o plano atual continua como está. Depois, outra pode ser feita.',
  keep: 'Manter',
  sent: 'Solicitação enviada. O plano muda só quando a plataforma aprovar.',
  cancelled: 'Solicitação cancelada.',
  unexpected: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export const changeRequestFormContent = {
  title: 'Solicitar mudança de plano',
  intro:
    'O administrador da plataforma analisa o pedido. Plano, limites e vigência só mudam com a aprovação; não há cobrança pelo sistema.',
  planLabel: 'Plano',
  current: 'Plano atual, para renovar a vigência',
  limits: (users, patients) =>
    `Até ${users} usuários e ${patients} pacientes ativos`,
  notes: 'Observação (opcional)',
  notesHelper: 'Até 500 caracteres.',
  choosePlan: 'Escolha um plano.',
  notesTooLong: 'Use no máximo 500 caracteres.',
  submit: 'Enviar solicitação',
  cancel: 'Cancelar',
};

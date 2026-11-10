export const careTeamContent = {
  title: 'Equipe de cuidado',
  subtitle: 'Quem acompanha o paciente e o vínculo de cada pessoa.',
  roles: {
    responsible_professional: 'Responsável',
    caregiver: 'Cuidador',
    family: 'Familiar',
  },
  responsibleHint: 'Muda na edição do paciente.',
  pending: 'Convite pendente',
  add: 'Vincular pessoa',
  inactivePatient: 'Paciente inativo não recebe vínculo novo.',
  edit: 'Editar vínculo',
  revoke: 'Revogar',
  empty: 'Nenhum cuidador ou familiar vinculado.',
  dialog: {
    addTitle: 'Vincular pessoa ao paciente',
    editTitle: 'Editar vínculo',
    role: 'Papel',
    user: 'Pessoa',
    userHelper: 'Usuários da organização com o perfil escolhido.',
    noUsers: 'Nenhum usuário disponível com este perfil.',
    linkType: 'Tipo de vínculo',
    linkTypeHelper: 'Opcional. Ex.: Filha, Cuidadora da casa.',
    note: 'Observação',
    cancel: 'Cancelar',
    save: 'Salvar vínculo',
    userRequired: 'Escolha a pessoa.',
    tooLong: (max) => `Use no máximo ${max} caracteres.`,
  },
  errors: {
    PATIENT_LINK_ALREADY_EXISTS:
      'Esta pessoa já tem vínculo vigente com o paciente.',
    PATIENT_LINK_INVALID_USER:
      'Escolha um cuidador ou familiar ativo da organização.',
    PATIENT_INACTIVE: 'O paciente está inativo e não aceita esta alteração.',
    PATIENT_LINK_REVOKED: 'Este vínculo já foi revogado.',
    unexpected: 'Não foi possível salvar agora. Tente de novo.',
  },
  revokeDialog: {
    title: 'Revogar vínculo?',
    text: (name) =>
      `${name} deixa de ver o paciente na próxima ação dentro do sistema. O histórico do vínculo fica guardado.`,
    confirm: 'Revogar vínculo',
    error: 'Não foi possível revogar agora. Tente de novo.',
  },
};

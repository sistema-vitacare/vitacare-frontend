// Organização de plataforma e seu administrador (o "master" da API), com os
// campos de GET /organizations/me e GET /users.
export const platformOrganization = {
  id: 'e5863e74-e628-5dc9-b172-15eac9b96299',
  code: 'vitacare',
  kind: 'platform',
  tradeName: 'VitaCare',
  legalName: null,
  document: null,
  phone: null,
  email: 'suporte@vitacare.example',
  status: 'active',
  usagePlanId: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
  deletedAt: null,
};

export const platformAdmin = {
  id: 'e879413c-a047-5b5d-bff0-2f9b9e822286',
  name: 'Caio Furtado',
  email: 'caio.furtado@vitacare.example',
  cpf: null,
  phone: null,
  status: 'active',
  profile: { code: 'platform_admin', name: 'Administrador da plataforma' },
  invitation: null,
  lastAccessAt: '2026-11-09T11:42:00.000Z',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
  deletedAt: null,
};

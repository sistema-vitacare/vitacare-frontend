// Vínculos de cuidado (cuidador e familiar) da organização, com os campos
// de GET /patient-links. O vínculo de profissional responsável não fica
// aqui: ele vem do campo `responsible` de cada paciente, como na API.

const CREATED_AT = '2026-09-22T13:00:00.000Z';

function link({ id, patientId, userId, role, linkType, note = null }) {
  return {
    id,
    patientId,
    userId,
    role,
    linkType,
    note,
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    revokedAt: null,
  };
}

// Pacientes
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const ANTENOR = 'a6be1260-48e5-58ca-bef8-ec5c16565bb2';
const ZULEICA = '18c5fa02-d759-54d4-bb69-1fd5410fcb6b';
const ARISTIDES = 'ff009b0d-75a5-54a9-8b02-cc748bad4b8b';
const NEUSA = '120c8cad-caaa-5d32-8cf7-8565faac6cb1';
const JURANDIR = '237d21c2-32c3-5373-b69c-f52d251fb118';
const AMELIA = '4246fc5a-24af-5db2-981a-72986adbe44e';

// Usuários
const ROSANGELA = '828a4d5b-6754-54c6-8b60-63833149e502';
const JULIANA = '485ba72b-e202-54ed-9f38-2294a18e1d29';
const MARCIO = '56cde9e6-4f69-5f6b-a0fa-dc414a232ccb';
const EDNA = '8ffa0d80-db2f-52a7-a275-08f89cce49c1';
const SONIA = '5df3da92-a648-5d60-8d32-a810002e3caa';
const TIAGO = '614a15d1-a6ad-512f-a199-00097924afdb';
const MIRELA = 'b7485ea0-016c-5fd5-813f-7a45ac99dab9';

const caregiver = (id, patientId, userId, note) =>
  link({
    id,
    patientId,
    userId,
    role: 'caregiver',
    linkType: 'Cuidadora da casa',
    note,
  });

export const patientLinks = [
  caregiver(
    '146a4992-9c76-5579-864a-806170e7b2ba',
    DIRCE,
    ROSANGELA,
    'Visitas de segunda a sexta, pela manhã.',
  ),
  caregiver('a0c340d0-5a23-58db-b20e-49c953b27e0d', OSVALDO, ROSANGELA),
  caregiver('d5501355-949c-5908-bf98-f308d5910322', CLEUSA, ROSANGELA),
  caregiver('3c1b61c4-d6ce-5320-aaf8-89833181effa', BENEDITO, ROSANGELA),
  caregiver('e48099bc-af29-528e-a93e-921a1198b075', IOLANDA, JULIANA),
  caregiver('d7be5460-a71c-558d-869a-447f201b7e31', ANTENOR, JULIANA),
  caregiver('ecd1a604-7ed2-5551-b433-e5dccaaeb4c1', ZULEICA, JULIANA),
  // Vínculo revogado: fica como histórico e não dá mais acesso.
  {
    ...caregiver('17af721b-98a7-53d3-84cd-62e37a4b1bf4', BENEDITO, JULIANA),
    status: 'revoked',
    updatedAt: '2026-10-15T17:40:00.000Z',
    revokedAt: '2026-10-15T17:40:00.000Z',
  },
  {
    ...caregiver('15e45b44-b8e7-5869-85fc-df28480e3817', ARISTIDES, MARCIO),
    linkType: 'Cuidador da casa',
  },
  {
    ...caregiver('cdd06877-947a-5c17-ad7e-f29f42b047e5', NEUSA, MARCIO),
    linkType: 'Cuidador da casa',
  },
  // A convidada, ainda pendente, já pode ser vinculada, como na API.
  caregiver('f9c18b71-3311-510e-8082-721e51dd6829', JURANDIR, EDNA),
  link({
    id: '59bdd77f-4b63-584f-809d-7cee07ea2a10',
    patientId: DIRCE,
    userId: SONIA,
    role: 'family',
    linkType: 'Filha',
  }),
  link({
    id: '23ed1a42-91b2-5ba0-8571-821ab45768ea',
    patientId: OSVALDO,
    userId: TIAGO,
    role: 'family',
    linkType: 'Filho',
  }),
  link({
    id: 'f5373d2f-c236-5b11-98dc-3b99cd7a519c',
    patientId: IOLANDA,
    userId: MIRELA,
    role: 'family',
    linkType: 'Neta',
  }),
  link({
    id: 'd345f8f0-7664-54db-8534-27a9f70e6375',
    patientId: AMELIA,
    userId: MIRELA,
    role: 'family',
    linkType: 'Vizinha e responsável',
    note: 'Acompanha as consultas quando a família não pode.',
  }),
];

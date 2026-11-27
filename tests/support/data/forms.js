// Formulários de acompanhamento da organização, com os campos de
// GET /forms/{formId}. As versões publicadas ficam em `versions`, da mais
// antiga para a vigente (a API as guarda no banco, sem rota própria, e os
// registros antigos continuam ligados a elas); o rascunho vivo da próxima
// versão fica em `draft`.

const FIELD_DEFAULTS = {
  requirement: 'optional',
  section: null,
  unit: null,
  decimalPlaces: null,
  scaleMin: null,
  scaleMax: null,
  options: null,
};

const number = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'number',
  decimalPlaces: 0,
  ...field,
});
const scale = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'scale',
  scaleMin: 0,
  scaleMax: 10,
  ...field,
});
const yesNo = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'boolean',
  ...field,
});
const freeText = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'text',
  ...field,
});
const singleChoice = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'single_choice',
  ...field,
});
const multipleChoice = (field) => ({
  ...FIELD_DEFAULTS,
  fieldType: 'multiple_choice',
  ...field,
});

// A posição do campo é o índice na lista, como na API.
const positioned = (fields) =>
  fields.map((field, position) => ({ ...field, position }));

// Pacientes das listas de público.
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const ARISTIDES = 'ff009b0d-75a5-54a9-8b02-cc748bad4b8b';

const APPETITE = ['Bom', 'Regular', 'Ruim'];
const ACTIVITIES = [
  'Banho assistido',
  'Troca de curativo',
  'Fisioterapia leve',
  'Exercício respiratório',
];

export const VITAL_SIGNS_FORM = {
  id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
  name: 'Sinais vitais',
  description: 'Aferição dos sinais vitais em cada visita.',
  trackingType: 'Dados clínicos',
  status: 'active',
  audience: 'organization',
  patientIds: [],
  // Frequência esperada: a ausência de registro além dela gera alerta.
  frequency: { interval: 1, unit: 'weeks' },
  createdAt: '2026-09-15T13:00:00.000Z',
  updatedAt: '2026-09-15T13:20:00.000Z',
  deactivatedAt: null,
  versions: [
    {
      id: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
      number: 1,
      publishedAt: '2026-09-15T13:20:00.000Z',
      fields: positioned([
        number({
          id: '3c44a6a8-5472-5c65-ad6a-42a6a946740e',
          fieldKey: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
          name: 'Pressão sistólica',
          requirement: 'required',
          section: 'Sinais vitais',
          unit: 'mmHg',
        }),
        number({
          id: '9570caa1-28fc-5e06-8327-bac0266a6c63',
          fieldKey: 'd74540e8-435d-5e23-8d57-dcc7e59e55d8',
          name: 'Pressão diastólica',
          requirement: 'required',
          section: 'Sinais vitais',
          unit: 'mmHg',
        }),
        number({
          id: '50df97ab-30b1-59c5-8ca4-afd4ef0d3d43',
          fieldKey: '22bd3492-e827-532e-b5cd-e0260e3e8728',
          name: 'Frequência cardíaca',
          section: 'Sinais vitais',
          unit: 'bpm',
        }),
        number({
          id: 'fb3abf95-e05e-5dc0-9b6d-f8f87cc665b1',
          fieldKey: '35bf5edc-a094-5f8e-ae63-248e316efe97',
          name: 'Saturação de oxigênio',
          section: 'Sinais vitais',
          unit: '%',
        }),
        number({
          id: 'e377f94a-6ab7-57f3-bc6a-764be9eda284',
          fieldKey: '38219edf-c13d-5e6a-9cd9-9fd2dfc59a10',
          name: 'Temperatura',
          section: 'Sinais vitais',
          unit: '°C',
          decimalPlaces: 1,
        }),
      ]),
    },
  ],
  draft: null,
};

// Vale só para quem tem registro diário: os outros pacientes têm um
// formulário só, e o registro de visita já o abre escolhido.
export const DAILY_FORM = {
  id: 'd9d5ba57-125a-506d-a026-be0c9dc2dad6',
  name: 'Acompanhamento diário',
  description: 'Glicemia, dor e alimentação do dia.',
  trackingType: 'Rotina',
  status: 'active',
  audience: 'patients',
  patientIds: [DIRCE, OSVALDO, IOLANDA],
  frequency: null,
  createdAt: '2026-09-15T13:30:00.000Z',
  updatedAt: '2026-09-15T13:45:00.000Z',
  deactivatedAt: null,
  versions: [
    {
      id: '55e6672a-f0d5-5f0c-a94a-dfd6ec3c5cab',
      number: 1,
      publishedAt: '2026-09-15T13:45:00.000Z',
      fields: positioned([
        number({
          id: '0198a37a-7962-5ebb-b9ba-7d2b29197736',
          fieldKey: 'b8c50e7a-6b23-50a0-b493-ade44ab23371',
          name: 'Glicemia capilar',
          section: 'Metabólico',
          unit: 'mg/dL',
        }),
        scale({
          id: '6895f963-ba57-5c77-9402-b7d08324dc0c',
          fieldKey: 'bd3146d6-997f-575d-abc9-c18f5108c7f1',
          name: 'Dor',
          section: 'Bem-estar',
        }),
        yesNo({
          id: 'f6b66ebd-c7eb-55dc-a7fe-2a4bf05ab32a',
          fieldKey: 'b50fee29-a135-52f5-a4fb-3fb546368309',
          name: 'Alimentou-se bem',
          section: 'Bem-estar',
        }),
      ]),
    },
  ],
  draft: null,
};

// Publicado, com um rascunho da próxima versão ainda não publicado: o peso
// volta a ser pedido e entra a qualidade do sono.
const HOME_VISIT_FORM = {
  id: '3c3086ad-9f4d-5f00-9bf4-7b1f33272a20',
  name: 'Visita HAS/DM2',
  description: 'Visita domiciliar de hipertensão e diabetes.',
  trackingType: 'Visita domiciliar',
  status: 'active',
  audience: 'patients',
  patientIds: [DIRCE, OSVALDO],
  frequency: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:30:00.000Z',
  deactivatedAt: null,
  versions: [
    {
      id: 'e9867dd1-33e8-5ad0-a718-1f6cce3dbf37',
      number: 1,
      publishedAt: '2026-10-01T12:30:00.000Z',
      fields: positioned([
        number({
          id: 'd47ef804-bff9-51f8-b96f-b143422bce04',
          fieldKey: 'ccb8f5b7-e7fd-52ef-bab5-4eedec1999b1',
          name: 'Pressão sistólica',
          requirement: 'required',
          section: 'Sinais vitais',
          unit: 'mmHg',
        }),
        number({
          id: 'da1ca92c-1c4d-54c1-b2dd-75420ffe77f1',
          fieldKey: 'fe9d04a2-104e-55ba-b534-7155f7530139',
          name: 'Pressão diastólica',
          requirement: 'required',
          section: 'Sinais vitais',
          unit: 'mmHg',
        }),
        number({
          id: '8de6643d-8390-568a-9fef-9cc77e67230b',
          fieldKey: '13ba8f5b-eca9-5a00-839b-7fb5fbb626b0',
          name: 'Glicemia capilar',
          section: 'Sinais vitais',
          unit: 'mg/dL',
        }),
        number({
          id: 'f3a726a5-4809-5714-9a28-7796d4e40cce',
          fieldKey: '386c1f38-b889-570a-bf91-9232f6285ca4',
          name: 'Peso',
          requirement: 'disabled',
          section: 'Sinais vitais',
          unit: 'kg',
          decimalPlaces: 1,
        }),
        scale({
          id: '27b7c8ba-3b5c-5de5-99b3-c5212d63cb8e',
          fieldKey: 'ea305de5-5a71-550b-8796-edac3073af97',
          name: 'Humor',
          section: 'Bem-estar',
        }),
        singleChoice({
          id: 'd1f2dd50-1a42-51fc-9dab-bccfb58966f1',
          fieldKey: 'ed1cc130-cec5-5b4c-b496-80c18d2159ee',
          name: 'Apetite',
          section: 'Bem-estar',
          options: APPETITE,
        }),
        yesNo({
          id: '88af25ec-932d-5f0f-9dcc-009686d04adb',
          fieldKey: '39a5ebe6-6401-5a84-a335-b0d2d7597e41',
          name: 'Tomou os medicamentos no horário',
          section: 'Medicação',
        }),
        multipleChoice({
          id: '426ce4f7-b1ed-521a-b2a3-3ca1f809d9fd',
          fieldKey: '05039783-ac75-51f4-a79d-2e8c3ea1741c',
          name: 'Atividades realizadas',
          section: 'Atividades',
          options: ACTIVITIES,
        }),
        freeText({
          id: '8c154b12-da6f-5abe-80f6-29a82ceefeec',
          fieldKey: '431057f2-79ce-5c60-8950-93ecf5795df3',
          name: 'Intercorrências',
          section: 'Atividades',
        }),
      ]),
    },
  ],
  draft: {
    id: 'd7cfe806-73bc-55d4-adb9-46b313c526bf',
    updatedAt: '2026-11-05T17:40:00.000Z',
    fields: positioned([
      number({
        id: '18f4561a-c8e7-5721-b6ce-1d3884aa3466',
        fieldKey: 'ccb8f5b7-e7fd-52ef-bab5-4eedec1999b1',
        name: 'Pressão sistólica',
        requirement: 'required',
        section: 'Sinais vitais',
        unit: 'mmHg',
      }),
      number({
        id: 'e11301ac-e23e-5719-a6d0-38f1d6982cef',
        fieldKey: 'fe9d04a2-104e-55ba-b534-7155f7530139',
        name: 'Pressão diastólica',
        requirement: 'required',
        section: 'Sinais vitais',
        unit: 'mmHg',
      }),
      number({
        id: 'e70f6184-aaf2-5ff5-bb06-ad5b8f7e7e9a',
        fieldKey: '13ba8f5b-eca9-5a00-839b-7fb5fbb626b0',
        name: 'Glicemia capilar',
        section: 'Sinais vitais',
        unit: 'mg/dL',
      }),
      number({
        id: '1a4194f7-78ab-5f01-8741-662b19193b5e',
        fieldKey: '386c1f38-b889-570a-bf91-9232f6285ca4',
        name: 'Peso',
        section: 'Sinais vitais',
        unit: 'kg',
        decimalPlaces: 1,
      }),
      scale({
        id: '0eb89e3a-d180-5705-9dde-a03cb93ba7e8',
        fieldKey: 'ea305de5-5a71-550b-8796-edac3073af97',
        name: 'Humor',
        section: 'Bem-estar',
      }),
      scale({
        id: 'e1f40011-78a1-554f-8bab-a709c080ae4a',
        fieldKey: '2fb53b47-3a70-5227-b1d2-9c44ec477b86',
        name: 'Qualidade do sono',
        section: 'Bem-estar',
      }),
      singleChoice({
        id: '0b66d83a-6c20-5dad-853b-2e9066db4ec8',
        fieldKey: 'ed1cc130-cec5-5b4c-b496-80c18d2159ee',
        name: 'Apetite',
        section: 'Bem-estar',
        options: APPETITE,
      }),
      yesNo({
        id: 'c7261f97-b863-5787-b020-08b9e7ba611d',
        fieldKey: '39a5ebe6-6401-5a84-a335-b0d2d7597e41',
        name: 'Tomou os medicamentos no horário',
        section: 'Medicação',
      }),
      multipleChoice({
        id: '790ace42-425d-5c2f-9311-387fe17d6d85',
        fieldKey: '05039783-ac75-51f4-a79d-2e8c3ea1741c',
        name: 'Atividades realizadas',
        section: 'Atividades',
        options: ACTIVITIES,
      }),
      freeText({
        id: '9071cac6-b7cf-58fc-9a8f-9f459191cc2b',
        fieldKey: '431057f2-79ce-5c60-8950-93ecf5795df3',
        name: 'Intercorrências',
        section: 'Atividades',
      }),
    ]),
  },
};

// Nunca publicado: o rascunho é todo o conteúdo dele.
const WELL_BEING_FORM = {
  id: 'fc78dd55-dd62-5075-bd49-995af47c3da7',
  name: 'Avaliação de bem-estar',
  description: null,
  trackingType: 'Bem-estar',
  status: 'draft',
  audience: 'organization',
  patientIds: [],
  frequency: { interval: 2, unit: 'weeks' },
  createdAt: '2026-11-03T14:00:00.000Z',
  updatedAt: '2026-11-03T14:00:00.000Z',
  deactivatedAt: null,
  versions: [],
  draft: {
    id: '785afc68-0719-5b55-9245-ab4d7ee24f73',
    updatedAt: '2026-11-04T11:15:00.000Z',
    fields: positioned([
      scale({
        id: '8326c5b2-5011-5bf9-99ca-b964ea95ec7a',
        fieldKey: 'be1dd389-ed8f-5ee2-a943-ea1920d5d6aa',
        name: 'Humor',
        requirement: 'required',
        section: 'Bem-estar',
      }),
      scale({
        id: '79c8d486-3063-5100-920d-d11668ab1542',
        fieldKey: 'db4199a3-6a94-5813-9dd7-3f57785ccab3',
        name: 'Qualidade do sono',
        section: 'Bem-estar',
      }),
      singleChoice({
        id: 'c9646fd7-384e-58f8-8c66-349676752b30',
        fieldKey: '7664e93d-2a19-5dd5-9b97-9135f9482233',
        name: 'Interação social',
        section: 'Bem-estar',
        options: ['Boa', 'Regular', 'Ruim'],
      }),
      freeText({
        id: '110ebb81-88bf-5bf9-bea7-649b8fd31d32',
        fieldKey: '747f6e98-04c6-5d9b-8466-f07080428a40',
        name: 'Comentários do cuidador',
        section: 'Observações',
      }),
    ]),
  },
};

// Duas versões publicadas: a segunda incluiu o uso de oxigênio.
const RESPIRATORY_FORM = {
  id: '44822b21-2459-5daa-bae0-e2cb0a6e37fb',
  name: 'Monitoramento respiratório',
  description: 'Acompanhamento de pacientes com doença pulmonar crônica.',
  trackingType: 'Dados clínicos',
  status: 'active',
  audience: 'patients',
  patientIds: [ARISTIDES],
  frequency: null,
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-10-20T15:00:00.000Z',
  deactivatedAt: null,
  versions: [
    {
      id: '248dc369-9653-513c-9808-b8b5a0bd25d0',
      number: 1,
      publishedAt: '2026-09-20T12:30:00.000Z',
      fields: positioned([
        number({
          id: '0561e1ef-4646-5157-a56f-6f29dfc66615',
          fieldKey: '9eb74567-491d-5c7d-aa78-db126a1fa949',
          name: 'Saturação de oxigênio',
          requirement: 'required',
          section: 'Respiração',
          unit: '%',
        }),
        number({
          id: '78da03db-4f6e-5fdd-a106-19dbcd1360ee',
          fieldKey: '8ef74df3-59c6-5074-b06b-b1eeacc1dfad',
          name: 'Frequência respiratória',
          section: 'Respiração',
          unit: 'irpm',
        }),
        scale({
          id: '7ec49234-24fc-5306-a4a5-fba300e8ba63',
          fieldKey: '285d4580-87e7-5069-9b69-1d410204c900',
          name: 'Falta de ar',
          section: 'Sintomas',
        }),
      ]),
    },
    {
      id: '2753ad41-5636-5875-bd0c-9de5a7133d43',
      number: 2,
      publishedAt: '2026-10-20T15:00:00.000Z',
      fields: positioned([
        number({
          id: '200b1d68-eb9a-515c-b772-6367ecd88935',
          fieldKey: '9eb74567-491d-5c7d-aa78-db126a1fa949',
          name: 'Saturação de oxigênio',
          requirement: 'required',
          section: 'Respiração',
          unit: '%',
        }),
        number({
          id: '65ea38a3-45c0-5b4d-b99c-bda5164a48db',
          fieldKey: '8ef74df3-59c6-5074-b06b-b1eeacc1dfad',
          name: 'Frequência respiratória',
          section: 'Respiração',
          unit: 'irpm',
        }),
        scale({
          id: '7f5891e8-b900-5be3-8d55-9e3a7d73c496',
          fieldKey: '285d4580-87e7-5069-9b69-1d410204c900',
          name: 'Falta de ar',
          section: 'Sintomas',
        }),
        yesNo({
          id: 'd631f45b-ee10-5b35-9bfe-b6b07fef144c',
          fieldKey: '5ad0d832-d893-51a8-a10a-3875e7da3dc8',
          name: 'Usou oxigênio',
          section: 'Sintomas',
        }),
      ]),
    },
  ],
  draft: null,
};

// Desativado: sai do alcance do cuidador e não recebe registro novo.
const TRIAGE_FORM = {
  id: '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a',
  name: 'Triagem de urgência',
  description: null,
  trackingType: 'Urgência',
  status: 'inactive',
  audience: 'organization',
  patientIds: [],
  frequency: null,
  createdAt: '2026-09-18T12:00:00.000Z',
  updatedAt: '2026-10-28T19:00:00.000Z',
  deactivatedAt: '2026-10-28T19:00:00.000Z',
  versions: [
    {
      id: '896ea687-009c-5b61-91f7-bc05d8c4ef49',
      number: 1,
      publishedAt: '2026-09-18T12:20:00.000Z',
      fields: positioned([
        singleChoice({
          id: '401a4ef0-de4b-5e3a-b884-85fd458a84be',
          fieldKey: '866eed80-e040-5cf6-9b31-2d1629772dc4',
          name: 'Nível de consciência',
          requirement: 'required',
          section: 'Avaliação',
          options: ['Alerta', 'Sonolento', 'Confuso'],
        }),
        number({
          id: '86b7dea1-eb62-5dd3-8150-4c3eefc8a665',
          fieldKey: 'e74bb75b-ef96-555a-836d-5935e5f7cec2',
          name: 'Temperatura',
          section: 'Avaliação',
          unit: '°C',
          decimalPlaces: 1,
        }),
        yesNo({
          id: '2fb6c6c8-adb9-598d-8750-352720f2c0cc',
          fieldKey: 'e18f5498-1d31-5df4-a928-1927daa77b0a',
          name: 'Dor no peito',
          section: 'Avaliação',
        }),
      ]),
    },
  ],
  draft: null,
};

export const forms = [
  VITAL_SIGNS_FORM,
  DAILY_FORM,
  HOME_VISIT_FORM,
  WELL_BEING_FORM,
  RESPIRATORY_FORM,
  TRIAGE_FORM,
];

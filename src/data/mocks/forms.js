// Formulários citados pelos registros simulados, com os metadados de cada
// campo como aparecem em `answers[]` de GET /follow-ups. O editor de
// formulários (FE-16) completa este arquivo.

export const VITAL_SIGNS_FORM = {
  id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
  name: 'Sinais vitais',
  versionId: '50c78bb2-d907-58b1-a4c0-44bea30d6b0a',
  versionNumber: 1,
  // Frequência esperada: a ausência de registro além dela gera alerta.
  expectedFrequency: { interval: 1, unit: 'weeks' },
  fields: [
    {
      fieldId: '3c44a6a8-5472-5c65-ad6a-42a6a946740e',
      fieldKey: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
      name: 'Pressão sistólica',
      fieldType: 'number',
      unit: 'mmHg',
      section: 'Sinais vitais',
      position: 0,
    },
    {
      fieldId: '9570caa1-28fc-5e06-8327-bac0266a6c63',
      fieldKey: 'd74540e8-435d-5e23-8d57-dcc7e59e55d8',
      name: 'Pressão diastólica',
      fieldType: 'number',
      unit: 'mmHg',
      section: 'Sinais vitais',
      position: 1,
    },
    {
      fieldId: '50df97ab-30b1-59c5-8ca4-afd4ef0d3d43',
      fieldKey: '22bd3492-e827-532e-b5cd-e0260e3e8728',
      name: 'Frequência cardíaca',
      fieldType: 'number',
      unit: 'bpm',
      section: 'Sinais vitais',
      position: 2,
    },
    {
      fieldId: 'fb3abf95-e05e-5dc0-9b6d-f8f87cc665b1',
      fieldKey: '35bf5edc-a094-5f8e-ae63-248e316efe97',
      name: 'Saturação de oxigênio',
      fieldType: 'number',
      unit: '%',
      section: 'Sinais vitais',
      position: 3,
    },
    {
      fieldId: 'e377f94a-6ab7-57f3-bc6a-764be9eda284',
      fieldKey: '38219edf-c13d-5e6a-9cd9-9fd2dfc59a10',
      name: 'Temperatura',
      fieldType: 'number',
      unit: '°C',
      section: 'Sinais vitais',
      position: 4,
    },
  ],
};

export const DAILY_FORM = {
  id: 'd9d5ba57-125a-506d-a026-be0c9dc2dad6',
  name: 'Acompanhamento diário',
  versionId: '55e6672a-f0d5-5f0c-a94a-dfd6ec3c5cab',
  versionNumber: 1,
  expectedFrequency: null,
  fields: [
    {
      fieldId: '0198a37a-7962-5ebb-b9ba-7d2b29197736',
      fieldKey: 'b8c50e7a-6b23-50a0-b493-ade44ab23371',
      name: 'Glicemia capilar',
      fieldType: 'number',
      unit: 'mg/dL',
      section: 'Metabólico',
      position: 0,
    },
    {
      fieldId: '6895f963-ba57-5c77-9402-b7d08324dc0c',
      fieldKey: 'bd3146d6-997f-575d-abc9-c18f5108c7f1',
      name: 'Dor',
      fieldType: 'scale',
      unit: null,
      section: 'Bem-estar',
      position: 1,
      scaleMin: 0,
      scaleMax: 10,
    },
    {
      fieldId: 'f6b66ebd-c7eb-55dc-a7fe-2a4bf05ab32a',
      fieldKey: 'b50fee29-a135-52f5-a4fb-3fb546368309',
      name: 'Alimentou-se bem',
      fieldType: 'boolean',
      unit: null,
      section: 'Bem-estar',
      position: 2,
    },
  ],
};

export const followUpForms = [VITAL_SIGNS_FORM, DAILY_FORM];

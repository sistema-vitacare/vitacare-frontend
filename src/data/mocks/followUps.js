// Registros de acompanhamento simulados, no formato de GET /follow-ups.
// As datas são relativas ao dia de hoje (fuso de Brasília): a evolução da
// API olha por padrão os últimos 30 dias, e datas fixas deixariam os
// gráficos vazios poucas semanas depois. Valores, autores e horários são
// fixos; só o dia acompanha o calendário.
import { todayInSaoPaulo } from '../../utils/format.js';
import { DAILY_FORM, VITAL_SIGNS_FORM } from './forms.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const BENEDITO = 'c7c8c69f-5e5b-5334-9e76-a51461033100';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';

const ROSANGELA = {
  id: '828a4d5b-6754-54c6-8b60-63833149e502',
  name: 'Rosângela Prado',
};
const JULIANA = {
  id: '485ba72b-e202-54ed-9f38-2294a18e1d29',
  name: 'Juliana Bastos',
};
const RAFAEL = {
  id: 'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  name: 'Rafael Moura Brandão',
};

// Brasília está em UTC−3 o ano todo desde 2019.
const UTC_OFFSET_HOURS = 3;
const SUBMIT_DELAY_MS = 8 * 60 * 1000;

/** Instante de `daysAgo` dias antes de hoje, às `time` de Brasília. */
export function localInstant(now, daysAgo, time) {
  const [year, month, day] = todayInSaoPaulo(now).split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day - daysAgo, hour + UTC_OFFSET_HOURS, minute),
  );
}

// Identificador estável por série e posição, no formato de UUID.
function followUpId(series, index) {
  return `f0110000-0000-5000-8000-${String(series).padStart(4, '0')}${String(
    index,
  ).padStart(8, '0')}`;
}

/**
 * Uma série de visitas de um paciente: a mais antiga primeiro, a cada
 * `stepDays` dias, terminando `lastDaysAgo` dias antes de hoje. `values`
 * tem uma lista por campo do formulário, na ordem dos campos.
 */
function series({
  code,
  patientId,
  form,
  author,
  time,
  stepDays,
  lastDaysAgo,
  values,
  notes = {},
  annulled = {},
}) {
  const count = values[0].length;
  // Os registros respondem a versão vigente do formulário.
  const version = form.versions.at(-1);
  return Array.from({ length: count }, (_, index) => ({
    id: followUpId(code, index),
    patientId,
    form,
    version,
    author,
    daysAgo: lastDaysAgo + (count - 1 - index) * stepDays,
    time,
    // Só os metadados que a API devolve em `answers[]`; a faixa da escala
    // fica no formulário.
    answers: version.fields.map((field, position) => ({
      fieldId: field.id,
      fieldKey: field.fieldKey,
      name: field.name,
      fieldType: field.fieldType,
      unit: field.unit,
      section: field.section,
      position: field.position,
      value: values[position][index],
    })),
    notes: notes[index] ?? null,
    annulment: annulled[index] ?? null,
  }));
}

const visits = [
  ...series({
    code: 1,
    patientId: DIRCE,
    form: VITAL_SIGNS_FORM,
    author: ROSANGELA,
    time: '09:30',
    stepDays: 3,
    lastDaysAgo: 1,
    values: [
      [142, 138, 145, 136, 168, 140, 134, 131, 152, 129, 133, 127, 130, 126],
      [88, 86, 90, 84, 98, 86, 82, 80, 92, 78, 82, 78, 80, 76],
      [78, 82, 76, 80, 96, 74, 72, 76, 70, 74, 72, 70, 72, 68],
      [96, 97, 95, 97, 94, 96, 97, 98, 97, 98, 97, 98, 98, 98],
      [
        36.5, 36.4, 36.8, 36.3, 37.4, 36.5, 36.4, 36.2, 36.6, 36.4, 36.5, 36.3,
        36.4, 36.5,
      ],
    ],
    notes: {
      4: 'Queixou-se de dor de cabeça. Profissional responsável avisado.',
      13: 'Pressão estável. Tomou os medicamentos no horário.',
    },
    annulled: {
      8: {
        annulledAt: null,
        annulledBy: RAFAEL,
        reason: 'Pressão aferida com o manguito de tamanho errado.',
      },
    },
  }),
  ...series({
    code: 2,
    patientId: DIRCE,
    form: DAILY_FORM,
    author: ROSANGELA,
    time: '16:00',
    stepDays: 3,
    lastDaysAgo: 2,
    values: [
      [112, 118, 105, 121, 109, 115, 98, 124, 110, 104, 117, 108, 101, 106],
      [3, 2, 4, 2, 5, 3, 2, 2, 1, 2, 3, 1, 1, 0],
      [
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
      ],
    ],
    notes: { 13: 'Dormiu bem. Fez uma caminhada curta no jardim.' },
  }),
  ...series({
    code: 3,
    patientId: OSVALDO,
    form: DAILY_FORM,
    author: ROSANGELA,
    time: '08:15',
    stepDays: 2,
    lastDaysAgo: 1,
    values: [
      [168, 192, 175, 210, 186, 264, 198, 172, 181, 166, 189, 170],
      [1, 1, 2, 1, 0, 2, 1, 1, 0, 1, 0, 0],
      [
        true,
        true,
        true,
        false,
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
      ],
    ],
    notes: { 5: 'Comeu doce escondido à noite. Família orientada.' },
  }),
  ...series({
    code: 4,
    patientId: BENEDITO,
    form: VITAL_SIGNS_FORM,
    author: ROSANGELA,
    time: '10:00',
    stepDays: 7,
    lastDaysAgo: 10,
    values: [
      [150, 146, 152, 148],
      [92, 88, 94, 90],
      [84, 88, 86, 82],
      [91, 92, 90, 92],
      [36.6, 36.7, 36.5, 36.6],
    ],
  }),
  ...series({
    code: 5,
    patientId: IOLANDA,
    form: DAILY_FORM,
    author: JULIANA,
    time: '14:30',
    stepDays: 2,
    lastDaysAgo: 2,
    values: [
      [99, 104, 97],
      [2, 2, 1],
      [true, true, true],
    ],
  }),
];

/** Registros com as datas calculadas a partir de `now`. */
export function followUpsAsOf(now) {
  return visits.map(({ daysAgo, time, form, version, annulment, ...visit }) => {
    const visitedAt = localInstant(now, daysAgo, time);
    return {
      id: visit.id,
      patientId: visit.patientId,
      form: {
        id: form.id,
        name: form.name,
        versionId: version.id,
        versionNumber: version.number,
      },
      author: visit.author,
      visitedAt: visitedAt.toISOString(),
      submittedAt: new Date(
        visitedAt.getTime() + SUBMIT_DELAY_MS,
      ).toISOString(),
      notes: visit.notes,
      status: annulment ? 'annulled' : 'valid',
      annulment: annulment && {
        ...annulment,
        // Anulado na tarde do mesmo dia da visita.
        annulledAt: new Date(
          visitedAt.getTime() + 5 * 60 * 60 * 1000,
        ).toISOString(),
      },
      answers: visit.answers,
    };
  });
}

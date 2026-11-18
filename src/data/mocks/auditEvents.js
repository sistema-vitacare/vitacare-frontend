// Eventos de auditoria, no formato de GET /audit-events/{eventId}, com os
// valores gravados. As datas são relativas ao momento da consulta, porque a
// lista usa por padrão os últimos 30 dias. Há eventos de sistema (alerta
// gerado, aviso de plano) e eventos de outra organização, que o
// administrador da plataforma vê com os nomes de pessoas mascarados. As
// ações feitas na sessão simulada não geram evento, exceto as exportações em
// PDF (`auditStore.js`).
import { auditActions } from './auditActions.js';
import { organization } from './organization.js';
import { BEM_VIVER_ID } from './organizations.js';

const HOUR_MS = 60 * 60 * 1000;

const catalog = new Map(auditActions.map((item) => [item.action, item]));

const IPE = { id: organization.id, name: organization.tradeName };
const BEM_VIVER = { id: BEM_VIVER_ID, name: 'Clínica Bem Viver' };

// Nome do perfil como a API grava: sem acento, igual ao catálogo do backend.
const person = (id, name, code, profileName) => ({
  type: 'user',
  user: { id, name },
  profile: { code, name: profileName },
});
const SYSTEM = { type: 'system', user: null, profile: null };

const HELENA = person(
  'f43fdabb-62fc-569d-aa6b-02800cd5b1cd',
  'Helena Vasconcelos',
  'admin',
  'Administrador',
);
const RAFAEL = person(
  'f6b21c50-000b-5e70-878b-b5e7f5f9a410',
  'Rafael Moura Brandão',
  'professional',
  'Profissional de saude',
);
const ROSANGELA = person(
  '828a4d5b-6754-54c6-8b60-63833149e502',
  'Rosângela Prado',
  'caregiver',
  'Cuidador',
);
const SONIA = person(
  '5df3da92-a648-5d60-8d32-a810002e3caa',
  'Sônia Albuquerque Moraes',
  'family',
  'Familiar',
);
const LUCIA = person(
  'b594e98b-f8e4-538e-85c6-2bb7248de350',
  'Lúcia Andrade Rocha',
  'admin',
  'Administrador',
);
const OTAVIO = person(
  'b5bde5b5-99b8-5f7d-912b-09d0873a6c2c',
  'Otávio Reis',
  'caregiver',
  'Cuidador',
);

const DIRCE = {
  type: 'patient',
  id: '0b639b83-76d0-570a-9017-7b6263d892cf',
  label: 'Dirce Albuquerque Moraes',
};
const BENEDITO = {
  type: 'patient',
  id: 'c7c8c69f-5e5b-5334-9e76-a51461033100',
  label: 'Benedito Arruda Paiva',
};
const ALZIRA = {
  type: 'patient',
  id: 'a2cacec9-94ff-5eae-b091-c9448add206b',
  label: 'Alzira Prates Monteiro',
};
const HILDA = {
  type: 'patient',
  id: '32e84e67-f8f3-5d39-9d20-6c0e07d4f5ba',
  label: 'Hilda Nascimento',
};
const PATRICIA = {
  type: 'user',
  id: '2fb0cec5-0e79-5ae3-9dd8-bea87be4292f',
  label: 'Patrícia Lemos Duarte',
};
const VITAL_SIGNS_FORM_ID = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const VITAL_SIGNS = {
  type: 'follow_up_form',
  id: VITAL_SIGNS_FORM_ID,
  label: 'Sinais vitais',
};
const LOSARTANA = {
  type: 'medication',
  id: '2cfba5e6-92b2-5822-8f2b-4220431410a5',
  label: 'Losartana potássica 50 mg',
};
// Registro e alerta que existem nos dados simulados, para que o link do
// item abra a tela deles.
const RECORD_ID = 'f0110000-0000-5000-8000-000100000003';
const RECORD = { type: 'follow_up_record', id: RECORD_ID, label: null };
const ABSENCE_ALERT = {
  type: 'alert',
  id: 'a1e70000-0000-5000-8009-000000000001',
  label: null,
};
const userEntity = ({ user }) => ({
  type: 'user',
  id: user.id,
  label: user.name,
});
const unlabeled = (type, id) => ({ type, id, label: null });
// A exportação gerencial é gravada sobre a própria organização.
const ORGANIZATION = {
  type: 'organization',
  id: organization.id,
  label: organization.tradeName,
};

// [horas antes da consulta, organização, responsável, ação, item, IP,
// valores gravados]. Os valores seguem o que cada repositório do backend
// grava; o alerta gerado traz a severidade do alerta.
const SEEDS = [
  [0.5, IPE, HELENA, 'auth.login_succeeded', userEntity(HELENA), '192.0.2.10'],
  [
    1,
    IPE,
    ROSANGELA,
    'follow_up.created',
    RECORD,
    '192.0.2.34',
    { formId: VITAL_SIGNS_FORM_ID, formVersionId: null, itemCount: 4 },
  ],
  [
    2,
    IPE,
    SYSTEM,
    'alert.generated',
    ABSENCE_ALERT,
    null,
    { source: 'absence', formId: VITAL_SIGNS_FORM_ID, severity: 'warning' },
  ],
  [
    3,
    IPE,
    RAFAEL,
    'alert.resolved',
    ABSENCE_ALERT,
    '192.0.2.21',
    { status: 'resolved' },
  ],
  [
    5,
    IPE,
    RAFAEL,
    'medication.updated',
    LOSARTANA,
    '192.0.2.21',
    { patientId: DIRCE.id, changedFields: ['times', 'notes'] },
  ],
  [9, IPE, SONIA, 'auth.login_succeeded', userEntity(SONIA), '198.51.100.7'],
  [
    20,
    IPE,
    ROSANGELA,
    'auth.login_failed',
    userEntity(ROSANGELA),
    '203.0.113.50',
  ],
  [
    26,
    IPE,
    RAFAEL,
    'form.published',
    VITAL_SIGNS,
    '192.0.2.21',
    { versionNumber: 2, impactConfirmed: true },
  ],
  [
    30,
    IPE,
    HELENA,
    'user.profile_changed',
    PATRICIA,
    '192.0.2.10',
    { fromProfile: 'admin', toProfile: 'professional' },
  ],
  [
    48,
    IPE,
    HELENA,
    'user.deactivated',
    PATRICIA,
    '192.0.2.10',
    { fromStatus: 'active' },
  ],
  [
    52,
    IPE,
    RAFAEL,
    'patient_report.exported',
    DIRCE,
    '192.0.2.21',
    { period: 30 },
  ],
  [
    70,
    IPE,
    RAFAEL,
    'patient.updated',
    BENEDITO,
    '192.0.2.21',
    { fields: ['phone', 'notes'] },
  ],
  [
    96,
    IPE,
    ROSANGELA,
    'follow_up_attachment.created',
    unlabeled('follow_up_attachment', 'a77ac400-0000-5000-8000-000000000001'),
    '192.0.2.34',
    {
      followUpId: RECORD_ID,
      fileName: 'curativo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 482113,
    },
  ],
  [
    120,
    IPE,
    RAFAEL,
    'follow_up.annulled',
    RECORD,
    '192.0.2.21',
    { ownRecord: false, reasonLength: 34 },
  ],
  [150, IPE, HELENA, 'patient.deactivated', ALZIRA, '192.0.2.10'],
  [
    170,
    IPE,
    HELENA,
    'organization.updated',
    {
      type: 'organization',
      id: organization.id,
      label: organization.tradeName,
    },
    '192.0.2.10',
    { changedFields: ['phone'] },
  ],
  [
    200,
    IPE,
    HELENA,
    'audit_events.exported',
    unlabeled('audit_events', null),
    '192.0.2.10',
    { period: 30, total: 41 },
  ],
  [
    400,
    IPE,
    HELENA,
    'auth.admin_password_reset',
    userEntity(RAFAEL),
    '192.0.2.10',
  ],
  [680, IPE, RAFAEL, 'patient.created', DIRCE, '192.0.2.21'],
  [
    3,
    BEM_VIVER,
    LUCIA,
    'auth.login_succeeded',
    userEntity(LUCIA),
    '198.51.100.40',
  ],
  [
    6,
    BEM_VIVER,
    OTAVIO,
    'follow_up.created',
    unlabeled('follow_up_record', 'f0110000-0000-5000-8000-0000ffff0001'),
    '198.51.100.41',
    { formId: null, formVersionId: null, itemCount: 3 },
  ],
  [40, BEM_VIVER, LUCIA, 'patient.created', HILDA, '198.51.100.40'],
  [
    44,
    BEM_VIVER,
    LUCIA,
    'user.created',
    userEntity(OTAVIO),
    '198.51.100.40',
    { profile: 'caregiver' },
  ],
  [
    60,
    BEM_VIVER,
    SYSTEM,
    'plan_expiry_notice.generated',
    unlabeled('organization_plan_term', 'de580151-b424-5121-94c1-5d00fde7409f'),
    null,
    { milestone: 'seven_days', recipients: 1 },
  ],
  // Novos eventos entram no fim: o id de cada um vem da posição na lista.
  [
    26,
    IPE,
    HELENA,
    'management_report.exported',
    ORGANIZATION,
    '192.0.2.10',
    { type: 'alerts', format: 'pdf', period: 30, condition: null },
  ],
  [
    120,
    IPE,
    HELENA,
    'management_report.exported',
    ORGANIZATION,
    '192.0.2.10',
    { type: 'caregiver_activity', format: 'pdf', period: 30, condition: null },
  ],
  [
    310,
    IPE,
    HELENA,
    'management_report.exported',
    ORGANIZATION,
    '192.0.2.10',
    { type: 'alerts', format: 'pdf', period: 30, condition: 'Diabetes' },
  ],
];

// Exportações gravam o período usado; aqui ele acompanha a data do evento.
function periodValues(values, occurredAt) {
  if (!values?.period) {
    return values;
  }
  const { period, ...rest } = values;
  const to = occurredAt.slice(0, 10);
  const from = new Date(Date.parse(to) - (period - 1) * 24 * HOUR_MS)
    .toISOString()
    .slice(0, 10);
  return { from, to, ...rest };
}

/** Eventos do mais recente para o mais antigo, como a lista da API. */
export function auditEventsAsOf(now = new Date()) {
  return SEEDS.map(
    ([hoursAgo, org, actor, action, entity, ipAddress, afterValues], index) => {
      const occurredAt = new Date(
        now.getTime() - hoursAgo * HOUR_MS,
      ).toISOString();
      const item = catalog.get(action);
      const sequence = String(index + 1).padStart(12, '0');
      return {
        id: `a0d17000-0000-5000-8000-${sequence}`,
        occurredAt,
        organization: org,
        actor: actor ?? SYSTEM,
        action,
        actionLabel: item.label,
        severity: item.severity ?? afterValues.severity,
        entity,
        ipAddress: ipAddress ?? null,
        requestId: ipAddress ? `simulado-auditoria-${sequence}` : null,
        beforeValues: null,
        afterValues: periodValues(afterValues ?? null, occurredAt),
      };
    },
  ).sort(
    (a, b) =>
      Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
      b.id.localeCompare(a.id),
  );
}

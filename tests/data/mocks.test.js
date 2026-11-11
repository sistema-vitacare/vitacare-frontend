// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { alertRules, alertsAsOf } from '../../src/data/mocks/alerts.js';
import { followUpForms } from '../../src/data/mocks/forms.js';
import { followUpsAsOf } from '../../src/data/mocks/followUps.js';
import { medications } from '../../src/data/mocks/medications.js';
import { organization } from '../../src/data/mocks/organization.js';
import { patientLinks } from '../../src/data/mocks/patientLinks.js';
import { patients } from '../../src/data/mocks/patients.js';
import {
  platformAdmin,
  platformOrganization,
} from '../../src/data/mocks/platform.js';
import { users } from '../../src/data/mocks/users.js';
import { isValidCpf } from '../../src/utils/cpf.js';

const people = [...users, ...patients];

describe('dados simulados', () => {
  it('não repetem identificador entre usuários e pacientes', () => {
    const ids = people.map((person) => person.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usam CPFs que passam nos dígitos verificadores', () => {
    const invalid = people.filter((person) => !isValidCpf(person.cpf));

    expect(invalid.map((person) => person.name)).toEqual([]);
  });

  it('não repetem CPF', () => {
    const cpfs = people.map((person) => person.cpf);

    expect(new Set(cpfs).size).toBe(cpfs.length);
  });

  it('ligam cada paciente a um responsável que a API aceitaria', () => {
    const eligible = new Map(
      users
        .filter(
          (user) =>
            ['professional', 'admin'].includes(user.profile.code) &&
            ['active', 'pending'].includes(user.status),
        )
        .map((user) => [user.id, user]),
    );
    const orphans = patients.filter(
      (patient) => !eligible.has(patient.responsible.id),
    );

    expect(orphans.map((patient) => patient.name)).toEqual([]);
  });

  // `.example` é reservado pela RFC 2606: nenhum e-mail simulado aponta para
  // um domínio que pode existir.
  it('usam só e-mails do domínio reservado .example', () => {
    const emails = [
      organization.email,
      platformOrganization.email,
      platformAdmin.email,
      ...people.map((person) => person.email),
    ];
    const real = emails.filter((email) => email && !email.endsWith('.example'));

    expect(real).toEqual([]);
  });
});

describe('dados simulados de acompanhamento', () => {
  const now = new Date('2026-11-10T15:00:00.000Z');
  const userById = new Map(users.map((user) => [user.id, user]));
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const activeLinks = patientLinks.filter((link) => link.status === 'active');

  it('vinculam só cuidador e familiar, no papel igual ao perfil, a pacientes existentes', () => {
    const wrong = patientLinks.filter((link) => {
      const user = userById.get(link.userId);
      return (
        !patientById.has(link.patientId) ||
        !user ||
        user.profile.code !== link.role ||
        !['caregiver', 'family'].includes(link.role)
      );
    });

    expect(wrong.map((link) => link.id)).toEqual([]);
  });

  it('têm no máximo um vínculo vigente por usuário e paciente', () => {
    const pairs = activeLinks.map((link) => `${link.userId}|${link.patientId}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('têm registros feitos só por cuidador com vínculo vigente com o paciente', () => {
    const linked = new Set(
      activeLinks
        .filter((link) => link.role === 'caregiver')
        .map((link) => `${link.userId}|${link.patientId}`),
    );
    const orphans = followUpsAsOf(now).filter(
      (followUp) => !linked.has(`${followUp.author.id}|${followUp.patientId}`),
    );

    expect(orphans.map((followUp) => followUp.id)).toEqual([]);
  });

  it('têm registros com identificadores únicos, todos antes de agora', () => {
    const followUps = followUpsAsOf(now);

    expect(new Set(followUps.map((item) => item.id)).size).toBe(
      followUps.length,
    );
    expect(
      followUps.filter((item) => Date.parse(item.visitedAt) >= now),
    ).toEqual([]);
  });

  it('respondem só campos que existem no formulário citado, com valor do tipo do campo', () => {
    const fields = new Map(
      followUpForms.flatMap((form) =>
        form.fields.map((field) => [`${form.id}|${field.fieldKey}`, field]),
      ),
    );
    const wrong = followUpsAsOf(now).flatMap((followUp) =>
      followUp.answers.filter((answer) => {
        const field = fields.get(`${followUp.form.id}|${answer.fieldKey}`);
        const expectedType =
          field?.fieldType === 'boolean' ? 'boolean' : 'number';
        return !field || typeof answer.value !== expectedType;
      }),
    );

    expect(wrong).toEqual([]);
  });

  it('geram alerta de leitura só quando o valor passa da referência da regra', () => {
    const rules = new Map(alertRules.map((rule) => [rule.id, rule]));
    const wrong = alertsAsOf(now)
      .filter((alert) => alert.source === 'reading')
      .filter(
        (alert) =>
          !(Number(alert.value) > rules.get(alert.rule.id).referenceValue),
      );

    expect(wrong).toEqual([]);
  });

  it('dão a cada alerta um identificador único', () => {
    const ids = alertsAsOf(now).map((alert) => alert.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('têm medicamentos de pacientes ativos, com unidade e via aceitas pela API', () => {
    const units = [
      'mg',
      'mcg',
      'g',
      'ml',
      'iu',
      'drops',
      'tablet',
      'capsule',
      'application',
    ];
    const routes = [
      'oral',
      'sublingual',
      'topical',
      'transdermal',
      'inhalation',
      'nasal',
      'ophthalmic',
      'otic',
      'rectal',
      'vaginal',
      'subcutaneous',
      'intramuscular',
      'intravenous',
      'other',
    ];
    const wrong = medications.filter(
      (medication) =>
        patientById.get(medication.patientId)?.status !== 'active' ||
        !units.includes(medication.doseUnit) ||
        !routes.includes(medication.route),
    );

    expect(wrong.map((medication) => medication.name)).toEqual([]);
  });
});

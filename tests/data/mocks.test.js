// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { alertRules, alertsAsOf } from '../../src/data/mocks/alerts.js';
import { attachmentsAsOf } from '../../src/data/mocks/attachments.js';
import { forms } from '../../src/data/mocks/forms.js';
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

  it('respondem só campos da versão citada, com os metadados dela e valor do tipo do campo', () => {
    const fields = new Map(
      forms.flatMap((form) =>
        form.versions.flatMap((version) =>
          version.fields.map((field) => [
            `${form.id}|${version.id}|${version.number}|${field.id}`,
            field,
          ]),
        ),
      ),
    );
    const wrong = followUpsAsOf(now).flatMap((followUp) =>
      followUp.answers.filter((answer) => {
        const { id, versionId, versionNumber } = followUp.form;
        const field = fields.get(
          `${id}|${versionId}|${versionNumber}|${answer.fieldId}`,
        );
        const expectedType =
          field?.fieldType === 'boolean' ? 'boolean' : 'number';
        return (
          !field ||
          field.requirement === 'disabled' ||
          ['fieldKey', 'name', 'fieldType', 'unit', 'section', 'position'].some(
            (key) => answer[key] !== field[key],
          ) ||
          typeof answer.value !== expectedType
        );
      }),
    );

    expect(wrong).toEqual([]);
  });

  it('têm formulários com versões numeradas a partir de 1, campos na posição do índice e cada chave sempre do mesmo tipo', () => {
    const wrong = forms.filter((form) => {
      const versions = [...form.versions, ...(form.draft ? [form.draft] : [])];
      const numbered = form.versions.every(
        (version, index) => version.number === index + 1,
      );
      const positioned = versions.every((version) =>
        version.fields.every((field, index) => field.position === index),
      );
      const types = new Map();
      const sameType = versions.every((version) =>
        version.fields.every((field) => {
          const known = types.get(field.fieldKey) ?? field.fieldType;
          types.set(field.fieldKey, known);
          return known === field.fieldType;
        }),
      );
      return !numbered || !positioned || !sameType;
    });

    expect(wrong.map((form) => form.name)).toEqual([]);
  });

  it('têm formulários com situação coerente com as versões e a desativação', () => {
    const wrong = forms.filter((form) => {
      if (form.status === 'draft') {
        return form.versions.length > 0 || !form.draft || form.deactivatedAt;
      }
      if (form.status === 'active') {
        return form.versions.length === 0 || form.deactivatedAt;
      }
      return form.status !== 'inactive' || !form.deactivatedAt;
    });

    expect(wrong.map((form) => form.name)).toEqual([]);
  });

  it('têm público coerente: lista de pacientes ativos, ou vazia para a organização inteira', () => {
    const wrong = forms.filter((form) =>
      form.audience === 'organization'
        ? form.patientIds.length > 0
        : form.patientIds.length === 0 ||
          form.patientIds.some(
            (patientId) => patientById.get(patientId)?.status !== 'active',
          ),
    );

    expect(wrong.map((form) => form.name)).toEqual([]);
  });

  it('têm registros só de formulários que valem para o paciente', () => {
    const formById = new Map(forms.map((form) => [form.id, form]));
    const wrong = followUpsAsOf(now).filter((followUp) => {
      const form = formById.get(followUp.form.id);
      return (
        form.audience === 'patients' &&
        !form.patientIds.includes(followUp.patientId)
      );
    });

    expect(wrong.map((followUp) => followUp.id)).toEqual([]);
  });

  it('têm anexos de registros válidos, enviados pelo autor depois do registro, no tipo e no tamanho aceitos', () => {
    const followUps = new Map(
      followUpsAsOf(now).map((followUp) => [followUp.id, followUp]),
    );
    const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const wrong = attachmentsAsOf(now).filter((attachment) => {
      const followUp = followUps.get(attachment.followUpId);
      return (
        !followUp ||
        followUp.status !== 'valid' ||
        attachment.uploadedBy.id !== followUp.author.id ||
        attachment.uploadedAt <= followUp.submittedAt ||
        !types.includes(attachment.contentType) ||
        attachment.sizeBytes < 1 ||
        attachment.sizeBytes > 10 * 1024 * 1024
      );
    });

    expect(wrong.map((attachment) => attachment.id)).toEqual([]);
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

  it('geram cada alerta de leitura depois do envio do registro de origem', () => {
    const followUps = new Map(
      followUpsAsOf(now).map((followUp) => [followUp.id, followUp]),
    );
    const early = alertsAsOf(now)
      .filter((alert) => alert.source === 'reading')
      .filter(
        (alert) =>
          alert.generatedAt <= followUps.get(alert.followUp.id).submittedAt,
      );

    expect(early.map((alert) => alert.id)).toEqual([]);
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

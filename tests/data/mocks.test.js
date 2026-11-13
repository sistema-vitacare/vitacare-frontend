// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  INVITATION_CHANNELS,
  INVITATION_STATUSES,
} from '../../src/constants/users.js';
import { alertRules } from '../../src/data/mocks/alertRules.js';
import { alertsAsOf } from '../../src/data/mocks/alerts.js';
import { attachmentsAsOf } from '../../src/data/mocks/attachments.js';
import { auditActions } from '../../src/data/mocks/auditActions.js';
import { auditEventsAsOf } from '../../src/data/mocks/auditEvents.js';
import { forms } from '../../src/data/mocks/forms.js';
import { followUpsAsOf } from '../../src/data/mocks/followUps.js';
import { medications } from '../../src/data/mocks/medications.js';
import { organization } from '../../src/data/mocks/organization.js';
import { clientOrganizations } from '../../src/data/mocks/organizations.js';
import { patientLinks } from '../../src/data/mocks/patientLinks.js';
import { patients } from '../../src/data/mocks/patients.js';
import {
  platformAdmin,
  platformOrganization,
} from '../../src/data/mocks/platform.js';
import {
  BASIC_PLAN,
  ENTERPRISE_PLAN,
  organizationTerm,
} from '../../src/data/mocks/plans.js';
import { users } from '../../src/data/mocks/users.js';
import { matchesOperator } from '../../src/utils/alertRules.js';
import {
  absenceMessage,
  reminderMessage,
} from '../../src/utils/alertMessages.js';
import { isValidCpf } from '../../src/utils/cpf.js';
import { todayInSaoPaulo } from '../../src/utils/format.js';
import { medicationErrors } from '../../src/utils/medicationFields.js';
import { occurrencesBetween } from '../../src/utils/medicationSchedule.js';

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

  it('dão convite só ao convidado, com canal, situação, validade e envio', () => {
    for (const user of users) {
      if (user.status !== 'pending') {
        expect(user.invitation, user.name).toBeNull();
        continue;
      }
      expect(Object.keys(user.invitation).sort(), user.name).toEqual([
        'channel',
        'expiresAt',
        'sentAt',
        'status',
      ]);
      expect(INVITATION_CHANNELS).toContain(user.invitation.channel);
      expect(INVITATION_STATUSES).toContain(user.invitation.status);
      // Senha provisória não passa pelo e-mail: não tem envio.
      if (user.invitation.channel === 'temporary_password') {
        expect(user.invitation.sentAt, user.name).toBeNull();
      }
    }
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

  it('têm regras sobre campo numérico ou de escala da versão vigente de formulário ativo', () => {
    const formById = new Map(forms.map((form) => [form.id, form]));
    const wrong = alertRules.filter((rule) => {
      const form = formById.get(rule.form.id);
      const field = form?.versions
        .at(-1)
        ?.fields.find((item) => item.fieldKey === rule.field.key);
      return (
        form?.status !== 'active' ||
        !['number', 'scale'].includes(field?.fieldType) ||
        field.name !== rule.field.name ||
        field.unit !== rule.field.unit ||
        rule.form.name !== form.name
      );
    });

    expect(wrong.map((rule) => rule.name)).toEqual([]);
  });

  it('têm regra de paciente só para paciente ativo a que o formulário se aplica', () => {
    const formById = new Map(forms.map((form) => [form.id, form]));
    const own = alertRules.filter((rule) => rule.patient);
    const wrong = own.filter((rule) => {
      const form = formById.get(rule.form.id);
      const patient = patientById.get(rule.patient.id);
      return (
        patient?.status !== 'active' ||
        patient.name !== rule.patient.name ||
        (form.audience !== 'organization' &&
          !form.patientIds.includes(patient.id))
      );
    });

    expect(own.length).toBeGreaterThan(0);
    expect(wrong.map((rule) => rule.name)).toEqual([]);
  });

  it('têm regras criadas antes de todos os registros simulados, e a inativa com data de desativação', () => {
    const first = followUpsAsOf(now)
      .map((followUp) => followUp.submittedAt)
      .sort()[0];
    const wrong = alertRules.filter(
      (rule) =>
        rule.createdAt >= first ||
        (rule.status === 'inactive') !== (rule.deactivatedAt !== null),
    );

    expect(alertRules.some((rule) => rule.status === 'inactive')).toBe(true);
    expect(wrong.map((rule) => rule.name)).toEqual([]);
  });

  it('geram alerta de leitura só quando o valor satisfaz a regra, com a severidade dela', () => {
    const rules = new Map(alertRules.map((rule) => [rule.id, rule]));
    const reading = alertsAsOf(now).filter(
      (alert) => alert.source === 'reading',
    );
    const wrong = reading.filter((alert) => {
      const rule = rules.get(alert.rule.id);
      return (
        !matchesOperator(
          rule.operator,
          Number(alert.value),
          rule.referenceValue,
        ) ||
        alert.severity !== rule.severity ||
        alert.operator !== rule.operator ||
        (rule.patient && rule.patient.id !== alert.patient.id)
      );
    });

    expect(reading.some((alert) => alert.operator === 'lt')).toBe(true);
    expect(wrong.map((alert) => alert.id)).toEqual([]);
  });

  it('geram lembretes só dos medicamentos ativos com lembrete, nos horários das últimas 24 horas', () => {
    const medicationById = new Map(
      medications.map((medication) => [medication.id, medication]),
    );
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const reminders = alertsAsOf(now).filter(
      (alert) => alert.source === 'medication_reminder',
    );
    const wrong = reminders.filter((alert) => {
      const medication = medicationById.get(
        alert.medicationReminder.medication.id,
      );
      const { scheduledAt } = alert.medicationReminder;
      return (
        medication.status !== 'active' ||
        !medication.remindersEnabled ||
        alert.patient.id !== medication.patientId ||
        alert.severity !== 'info' ||
        !occurrencesBetween(medication.schedule, from, now)
          .map((instant) => instant.toISOString())
          .includes(scheduledAt) ||
        alert.generatedAt < scheduledAt ||
        alert.generatedAt > now.toISOString() ||
        alert.message !==
          reminderMessage({
            medicationName: medication.name,
            doseAmount: medication.doseAmount,
            doseUnit: medication.doseUnit,
            scheduledAt,
          })
      );
    });

    expect(reminders.length).toBeGreaterThan(0);
    expect(wrong.map((alert) => alert.id)).toEqual([]);
  });

  it('geram a ausência de formulário com frequência que vale para o paciente, com a mensagem da API', () => {
    const formById = new Map(forms.map((form) => [form.id, form]));
    const absences = alertsAsOf(now).filter(
      (alert) => alert.source === 'absence',
    );
    const wrong = absences.filter((alert) => {
      const form = formById.get(alert.absence.form.id);
      return (
        !form.frequency ||
        (form.audience !== 'organization' &&
          !form.patientIds.includes(alert.patient.id)) ||
        alert.severity !== 'warning' ||
        alert.absence.dueAt <= alert.absence.since ||
        alert.generatedAt < alert.absence.dueAt ||
        alert.message !==
          absenceMessage({
            formName: form.name,
            since: alert.absence.since,
            frequency: form.frequency,
          })
      );
    });

    expect(absences).toHaveLength(1);
    expect(wrong.map((alert) => alert.id)).toEqual([]);
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

  it('têm medicamentos de pacientes ativos, com os campos que a API aceita', () => {
    const today = todayInSaoPaulo(now);
    const wrong = medications.filter(
      (medication) =>
        patientById.get(medication.patientId)?.status !== 'active' ||
        medicationErrors(
          {
            patientId: medication.patientId,
            name: medication.name,
            doseAmount: medication.doseAmount,
            doseUnit: medication.doseUnit,
            route: medication.route,
            notes: medication.notes,
            startDate: medication.schedule.startDate,
            endDate: medication.schedule.endDate,
            intervalDays: medication.schedule.intervalDays,
            times: medication.schedule.times,
            remindersEnabled: medication.remindersEnabled,
          },
          { today },
        ).length > 0,
    );

    expect(wrong.map((medication) => medication.name)).toEqual([]);
  });

  it('têm medicamentos com situação coerente com a inativação e pelo menos um inativo', () => {
    const wrong = medications.filter(
      (medication) =>
        (medication.status === 'inactive') !==
          (medication.deactivatedAt !== null) ||
        medication.createdAt >
          (medication.deactivatedAt ?? medication.createdAt),
    );

    expect(medications.some((item) => item.status === 'inactive')).toBe(true);
    expect(wrong.map((medication) => medication.name)).toEqual([]);
  });
});

describe('dados simulados de gestão', () => {
  const now = new Date();
  const events = auditEventsAsOf(now);
  const catalog = new Map(auditActions.map((item) => [item.action, item]));

  it('seguem os limites do Quadro 2: Basic com 10 usuários e 200 pacientes, Enterprise com 50 e 1.000', () => {
    expect([BASIC_PLAN.userLimit, BASIC_PLAN.patientLimit]).toEqual([10, 200]);
    expect([ENTERPRISE_PLAN.userLimit, ENTERPRISE_PLAN.patientLimit]).toEqual([
      50, 1000,
    ]);
    expect(BASIC_PLAN.expandable).toBe(false);
    expect(ENTERPRISE_PLAN.expandable).toBe(true);
  });

  it('dão ao Enterprise todos os recursos do Basic e o painel operacional só a ele', () => {
    expect(
      BASIC_PLAN.features.every((feature) =>
        ENTERPRISE_PLAN.features.includes(feature),
      ),
    ).toBe(true);
    expect(BASIC_PLAN.features).not.toContain('operational_dashboard');
    expect(ENTERPRISE_PLAN.features).toContain('operational_dashboard');
  });

  it('põem a organização de demonstração no Enterprise, com o termo apontando para ele', () => {
    expect(organization.usagePlanId).toBe(ENTERPRISE_PLAN.id);
    expect(organizationTerm.planId).toBe(ENTERPRISE_PLAN.id);
    expect(organizationTerm.organizationId).toBe(organization.id);
  });

  it('dão a cada organização cliente um plano do catálogo e um código no formato da API', () => {
    for (const item of clientOrganizations) {
      expect([BASIC_PLAN.id, ENTERPRISE_PLAN.id]).toContain(item.usagePlanId);
      expect(item.code).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(clientOrganizations.map((item) => item.id)).not.toContain(
      platformOrganization.id,
    );
  });

  it('copiam as 67 ações do catálogo da API, sem repetir código', () => {
    expect(auditActions).toHaveLength(67);
    expect(catalog.size).toBe(67);
  });

  it('trazem as ações do convite por e-mail e do aceite do termo de uso', () => {
    expect(catalog.get('user.invitation_sent')).toEqual({
      action: 'user.invitation_sent',
      label: 'Enviou convite por e-mail',
      severity: 'info',
    });
    expect(catalog.get('user.invitation_failed')?.severity).toBe('warning');
    expect(catalog.get('user.invitation_accepted')?.label).toBe(
      'Aceitou o convite e cadastrou a senha',
    );
    expect(catalog.get('terms.accepted')?.label).toBe('Aceitou o termo de uso');
  });

  // Formato de `recordExport` do backend: a lista de relatórios recentes e o
  // "N gerados" saem desses valores.
  it('trazem exportações gerenciais com tipo, formato, período e condição', () => {
    const exports = events.filter(
      (event) => event.action === 'management_report.exported',
    );

    expect(new Set(exports.map((event) => event.afterValues.type))).toEqual(
      new Set(['alerts', 'caregiver_activity']),
    );
    for (const event of exports) {
      expect(event.entity.type).toBe('organization');
      expect(Object.keys(event.afterValues).sort()).toEqual([
        'condition',
        'format',
        'from',
        'to',
        'type',
      ]);
      expect(event.afterValues.from <= event.afterValues.to).toBe(true);
    }
  });

  it('registram só ações do catálogo, com o rótulo e a gravidade dele', () => {
    for (const event of events) {
      const item = catalog.get(event.action);
      expect(item, event.action).toBeDefined();
      expect(event.actionLabel).toBe(item.label);
      expect(event.severity).toBe(item.severity ?? event.afterValues.severity);
    }
  });

  it('ficam em organizações clientes existentes, com mais de uma organização para a plataforma', () => {
    const ids = new Set(clientOrganizations.map((item) => item.id));
    const used = new Set(events.map((event) => event.organization.id));

    expect([...used].every((id) => ids.has(id))).toBe(true);
    expect(used.size).toBeGreaterThan(1);
  });

  it('têm evento de sistema sem responsável, IP nem perfil', () => {
    const system = events.filter((event) => event.actor.type === 'system');

    expect(system.length).toBeGreaterThan(0);
    for (const event of system) {
      expect(event.actor).toEqual({
        type: 'system',
        user: null,
        profile: null,
      });
      expect(event.ipAddress).toBeNull();
    }
  });

  it('caem nos últimos 30 dias e vêm do mais recente para o mais antigo', () => {
    const limit = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const times = events.map((event) => Date.parse(event.occurredAt));

    expect(times.every((time) => time >= limit && time <= now.getTime())).toBe(
      true,
    );
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  });
});

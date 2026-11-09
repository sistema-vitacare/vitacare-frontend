// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { organization } from '../../src/data/mocks/organization.js';
import { patients } from '../../src/data/mocks/patients.js';
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
      ...people.map((person) => person.email),
    ];
    const real = emails.filter((email) => email && !email.endsWith('.example'));

    expect(real).toEqual([]);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PERMISSIONS as P } from '../../src/constants/permissions.js';
import {
  PATHS,
  alertPath,
  formPath,
  patientPath,
  recordPath,
  userPath,
} from '../../src/constants/routes.js';
import { auditEntityPath } from '../../src/utils/auditEntity.js';

const OWN = 'org-propria';
const everything = () => true;
const nothing = () => false;
const event = (entity, organizationId = OWN) => ({
  organization: { id: organizationId },
  entity,
});
const reach = { organizationId: OWN, can: everything };

describe('auditEntityPath', () => {
  it('leva cada item com tela à tela dele', () => {
    expect(auditEntityPath(event({ type: 'patient', id: 'p1' }), reach)).toBe(
      patientPath('p1'),
    );
    expect(auditEntityPath(event({ type: 'user', id: 'u1' }), reach)).toBe(
      userPath('u1'),
    );
    expect(
      auditEntityPath(event({ type: 'follow_up_record', id: 'r1' }), reach),
    ).toBe(recordPath('r1'));
    expect(auditEntityPath(event({ type: 'alert', id: 'a1' }), reach)).toBe(
      alertPath('a1'),
    );
    expect(
      auditEntityPath(event({ type: 'follow_up_form', id: 'f1' }), reach),
    ).toBe(formPath('f1'));
    expect(
      auditEntityPath(event({ type: 'organization', id: OWN }), reach),
    ).toBe(PATHS.SETTINGS);
  });

  it('não leva a item sem tela própria nem sem identificador', () => {
    for (const entity of [
      { type: 'medication', id: 'm1' },
      { type: 'follow_up_attachment', id: 'x1' },
      { type: 'audit_events', id: null },
      { type: 'patient', id: null },
    ]) {
      expect(auditEntityPath(event(entity), reach)).toBeNull();
    }
  });

  it('não leva a item de outra organização', () => {
    expect(
      auditEntityPath(event({ type: 'patient', id: 'p1' }, 'outra'), reach),
    ).toBeNull();
  });

  it('respeita a permissão de ler a tela do item', () => {
    expect(
      auditEntityPath(event({ type: 'user', id: 'u1' }), {
        organizationId: OWN,
        can: (permission) => permission !== P.USERS_READ,
      }),
    ).toBeNull();
    expect(
      auditEntityPath(event({ type: 'patient', id: 'p1' }), {
        organizationId: OWN,
        can: nothing,
      }),
    ).toBeNull();
  });
});

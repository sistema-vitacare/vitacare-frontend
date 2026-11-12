// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  permissionsFor,
} from '../../src/constants/permissions.js';
import {
  NAV_ITEMS,
  PATHS,
  alertPath,
  alertsPath,
  formPath,
  homePath,
  medicationsPath,
  patientPath,
  recordPath,
  recordsPath,
  usesBottomNav,
  visibleNavItems,
} from '../../src/constants/routes.js';

// `can` igual ao da sessão, montado a partir da matriz do perfil.
function canFor(profileCode) {
  const granted = new Set(permissionsFor(profileCode));
  return (permission) => granted.has(permission);
}

const nobody = () => false;

describe('menu', () => {
  it.each([
    [
      'admin',
      [
        'dashboard',
        'patients',
        'records',
        'medications',
        'alerts',
        'forms',
        'reports',
        'users',
        'audit',
        'settings',
      ],
    ],
    [
      'professional',
      ['patients', 'records', 'medications', 'alerts', 'forms', 'reports'],
    ],
    ['caregiver', ['patients', 'records', 'medications', 'alerts', 'forms']],
    ['family', ['patients', 'records', 'medications', 'alerts']],
    ['platform_admin', ['organizations', 'audit', 'settings']],
  ])('mostra ao perfil %s apenas os itens da sua matriz', (profile, ids) => {
    expect(visibleNavItems(canFor(profile)).map((item) => item.id)).toEqual(
      ids,
    );
  });

  it('fica vazio sem nenhuma permissão', () => {
    expect(visibleNavItems(nobody)).toEqual([]);
  });

  it('exige de cada item uma permissão que existe no catálogo', () => {
    const catalog = new Set(Object.values(PERMISSIONS));

    expect(
      NAV_ITEMS.filter((item) => !catalog.has(item.permission)).map(
        (item) => item.id,
      ),
    ).toEqual([]);
  });

  it('não repete endereço entre itens', () => {
    const paths = NAV_ITEMS.map((item) => item.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('página inicial', () => {
  it.each([
    ['admin', PATHS.DASHBOARD],
    ['platform_admin', PATHS.ORGANIZATIONS],
    ['professional', PATHS.PATIENTS],
    ['caregiver', PATHS.PATIENTS],
    ['family', PATHS.PATIENTS],
  ])('leva o perfil %s para %s', (profile, path) => {
    expect(homePath(canFor(profile))).toBe(path);
  });

  it('não existe sem nenhuma permissão', () => {
    expect(homePath(nobody)).toBeNull();
  });
});

describe('barra inferior no celular', () => {
  it.each([
    ['caregiver', true],
    ['admin', false],
    ['professional', false],
    ['family', false],
    ['platform_admin', false],
  ])('para o perfil %s: %s', (profile, expected) => {
    expect(usesBottomNav(canFor(profile))).toBe(expected);
  });
});

describe('endereços do paciente', () => {
  it('monta detalhe, edição e histórico a partir do id, com o id codificado', () => {
    expect(patientPath('abc')).toBe('/pacientes/abc');
    expect(patientPath('abc', 'edit')).toBe('/pacientes/abc/editar');
    expect(patientPath('abc', 'history')).toBe('/pacientes/abc/historico');
    expect(patientPath('abc', 'visit')).toBe('/pacientes/abc/registrar');
    expect(patientPath('a/b')).toBe('/pacientes/a%2Fb');
  });

  it('mantém o cadastro fora do padrão do detalhe', () => {
    expect(PATHS.PATIENT_NEW).toBe('/pacientes/novo');
    expect(PATHS.PATIENT_DETAIL).toBe('/pacientes/:patientId');
  });
});

describe('endereços de formulários e registros', () => {
  it('monta a página do formulário e o detalhe do registro, com o id codificado', () => {
    expect(formPath('abc')).toBe('/formularios/abc');
    expect(formPath('a/b')).toBe('/formularios/a%2Fb');
    expect(recordPath('abc')).toBe('/registros/abc');
    expect(recordPath('a/b')).toBe('/registros/a%2Fb');
  });

  it('leva à lista de registros com o paciente no endereço', () => {
    expect(recordsPath('abc')).toBe('/registros?paciente=abc');
    expect(recordsPath('a&b')).toBe('/registros?paciente=a%26b');
    expect(recordsPath()).toBe('/registros');
  });

  it('mantém o formulário novo fora do padrão da página do formulário', () => {
    expect(PATHS.FORM_NEW).toBe('/formularios/novo');
    expect(PATHS.FORM_DETAIL).toBe('/formularios/:formId');
    expect(PATHS.PATIENT_VISIT).toBe('/pacientes/:patientId/registrar');
    expect(PATHS.RECORD_DETAIL).toBe('/registros/:followUpId');
  });
});

describe('endereços de medicamentos e alertas', () => {
  it('leva às listas com o paciente no endereço, o mesmo parâmetro dos registros', () => {
    expect(medicationsPath('abc')).toBe('/medicamentos?paciente=abc');
    expect(medicationsPath('a&b')).toBe('/medicamentos?paciente=a%26b');
    expect(medicationsPath()).toBe('/medicamentos');
    expect(alertsPath('abc')).toBe('/alertas?paciente=abc');
    expect(alertsPath()).toBe('/alertas');
  });

  it('monta o detalhe do alerta com o id codificado', () => {
    expect(alertPath('abc')).toBe('/alertas/abc');
    expect(alertPath('a/b')).toBe('/alertas/a%2Fb');
    expect(PATHS.ALERT_DETAIL).toBe('/alertas/:alertId');
  });
});

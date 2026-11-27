import { describe, expect, it } from 'vitest';
import { patientListContent as content } from '../../src/data/patientList.js';

describe('subtítulo da lista de pacientes', () => {
  it('concorda com um paciente só', () => {
    expect(content.subtitle(1, 'active')).toBe('1 paciente ativo');
    expect(content.subtitle(1, 'inactive')).toBe('1 paciente inativo');
  });

  it('fica no plural com nenhum ou mais de um paciente', () => {
    expect(content.subtitle(0, 'active')).toBe('0 pacientes ativos');
    expect(content.subtitle(2, 'inactive')).toBe('2 pacientes inativos');
  });
});

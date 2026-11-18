import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DefinitionList from '../../src/components/DefinitionList.jsx';

describe('DefinitionList', () => {
  it('liga cada rótulo ao seu valor, em texto ou elemento', () => {
    render(
      <DefinitionList
        rows={[
          ['Paciente', <a href="/pacientes/1">Dirce</a>],
          ['Situação', 'Aberto'],
        ]}
      />,
    );

    const terms = screen.getAllByRole('term');
    const values = screen.getAllByRole('definition');
    expect(terms.map((term) => term.textContent)).toEqual([
      'Paciente',
      'Situação',
    ]);
    expect(values[0]).toContainElement(
      screen.getByRole('link', { name: 'Dirce' }),
    );
    expect(values[1]).toHaveTextContent('Aberto');
  });
});

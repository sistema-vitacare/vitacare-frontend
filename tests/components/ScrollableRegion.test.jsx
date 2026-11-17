import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScrollableRegion from '../../src/components/ScrollableRegion.jsx';

describe('ScrollableRegion', () => {
  it('é uma região com nome, que recebe foco pelo teclado para rolar o conteúdo', () => {
    render(
      <ScrollableRegion label="Pacientes por responsável">
        <table>
          <tbody>
            <tr>
              <td>Rafael Moura Brandão</td>
            </tr>
          </tbody>
        </table>
      </ScrollableRegion>,
    );

    const region = screen.getByRole('region', {
      name: 'Pacientes por responsável',
    });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});

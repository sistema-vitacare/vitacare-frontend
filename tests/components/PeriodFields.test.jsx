import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PeriodFields from '../../src/components/PeriodFields.jsx';
import { periodFieldsContent as content } from '../../src/data/periodFields.js';
import { theme } from '../../src/styles/theme.js';

function renderFields(props) {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <PeriodFields from="" to="" onChange={onChange} {...props} />
    </ThemeProvider>,
  );
  return onChange;
}

describe('PeriodFields', () => {
  it('não avisa erro quando não há erro', () => {
    renderFields();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra as datas de início e fim recebidas', () => {
    renderFields({ from: '2026-10-01', to: '2026-10-31' });

    expect(screen.getByLabelText(content.from)).toHaveValue('2026-10-01');
    expect(screen.getByLabelText(content.to)).toHaveValue('2026-10-31');
  });

  it('avisa cada mudança só com o campo alterado', () => {
    const onChange = renderFields();

    fireEvent.change(screen.getByLabelText(content.from), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText(content.to), {
      target: { value: '2026-10-31' },
    });

    expect(onChange.mock.calls).toEqual([
      [{ from: '2026-10-01' }],
      [{ to: '2026-10-31' }],
    ]);
  });

  it('mostra o erro da API abaixo do campo apontado', () => {
    renderFields({ errors: { to: 'PERIOD_TOO_LONG' } });

    expect(
      screen.getByText(content.errors.PERIOD_TOO_LONG),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(content.to)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PasswordField from '../../src/components/PasswordField.jsx';
import { passwordToggle } from '../../src/data/access.js';

function renderField() {
  render(<PasswordField label="Senha" value="segredo-1" onChange={() => {}} />);
  return screen.getByLabelText('Senha', { selector: 'input' });
}

describe('PasswordField', () => {
  it('começa com a senha oculta', () => {
    expect(renderField()).toHaveAttribute('type', 'password');
  });

  it('mostra e volta a ocultar a senha pelo botão', () => {
    const input = renderField();

    fireEvent.click(screen.getByRole('button', { name: passwordToggle.show }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: passwordToggle.hide }));
    expect(input).toHaveAttribute('type', 'password');
  });
});

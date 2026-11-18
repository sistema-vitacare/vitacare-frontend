import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TemporaryPasswordField from '../../src/components/TemporaryPasswordField.jsx';
import { temporaryPasswordContent as content } from '../../src/data/temporaryPassword.js';

const PASSWORD = 'Kq7mPz3xWb9tHn4rYc2v';

function stubClipboard(clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
}

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

describe('TemporaryPasswordField', () => {
  it('mostra a senha só para leitura', () => {
    render(<TemporaryPasswordField password={PASSWORD} />);

    const field = screen.getByLabelText(content.label);
    expect(field).toHaveValue(PASSWORD);
    expect(field).toHaveAttribute('readonly');
  });

  it('copia pela área de transferência e confirma', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    render(<TemporaryPasswordField password={PASSWORD} />);

    fireEvent.click(screen.getByRole('button', { name: content.copy }));

    expect(await screen.findByText(content.copied)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(PASSWORD);
  });

  it('sem área de transferência nem cópia pelo campo, pede para copiar à mão', async () => {
    stubClipboard(undefined);
    document.execCommand = vi.fn(() => false);
    render(<TemporaryPasswordField password={PASSWORD} />);

    fireEvent.click(screen.getByRole('button', { name: content.copy }));

    expect(await screen.findByText(content.copyFailed)).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../../src/components/ConfirmDialog.jsx';
import { confirmDialogContent } from '../../src/data/patientFields.js';

function renderDialog(props = {}) {
  const handlers = { onConfirm: vi.fn(), onClose: vi.fn() };
  render(
    <ConfirmDialog
      open
      title="Inativar paciente?"
      text="O histórico é preservado."
      confirmLabel="Inativar"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('ConfirmDialog', () => {
  it('mostra o título e a explicação da ação', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Inativar paciente?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('O histórico é preservado.')).toBeInTheDocument();
  });

  it('confirma pelo botão da ação e cancela pelo Cancelar', () => {
    const { onConfirm, onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Inativar' }));
    fireEvent.click(
      screen.getByRole('button', { name: confirmDialogContent.cancel }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro da ação e trava os botões enquanto ela roda', () => {
    renderDialog({ pending: true, error: 'Não foi possível inativar.' });

    expect(screen.getByText('Não foi possível inativar.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: confirmDialogContent.cancel }),
    ).toBeDisabled();
  });

  it('troca o "Cancelar" quando a própria ação é um cancelamento', () => {
    const { onClose } = renderDialog({
      title: 'Cancelar a solicitação?',
      confirmLabel: 'Cancelar solicitação',
      cancelLabel: 'Manter',
    });

    expect(
      screen.queryByRole('button', { name: confirmDialogContent.cancel }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

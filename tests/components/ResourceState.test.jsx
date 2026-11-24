import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResourceState from '../../src/components/ResourceState.jsx';
import { ApiError } from '../../src/services/apiClient.js';
import { resourceStateContent } from '../../src/data/patientFields.js';

function renderState(resource) {
  render(
    <ResourceState resource={resource} emptyText="Nenhum paciente.">
      {(data) => <p>Itens: {data.length}</p>}
    </ResourceState>,
  );
}

describe('ResourceState', () => {
  it('anuncia o carregamento sem mostrar o conteúdo', () => {
    renderState({ status: 'loading' });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/Itens/)).not.toBeInTheDocument();
  });

  it('mostra o conteúdo com os dados', () => {
    renderState({ status: 'success', data: [1, 2] });

    expect(screen.getByText('Itens: 2')).toBeInTheDocument();
  });

  it('mostra o texto de lista vazia', () => {
    renderState({ status: 'empty', data: [] });

    expect(screen.getByText('Nenhum paciente.')).toBeInTheDocument();
  });

  it('mostra a mensagem da API no lugar do texto da tela', () => {
    const message =
      'Você ainda não tem paciente vinculado. Peça ao profissional responsável para liberar o seu acesso.';
    renderState({ status: 'empty', data: [], meta: { message } });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum paciente.')).not.toBeInTheDocument();
  });

  it('mostra o erro com o botão de nova tentativa', () => {
    const retry = vi.fn();
    renderState({ status: 'error', error: new Error('falhou'), retry });

    expect(screen.getByText(resourceStateContent.error)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: resourceStateContent.retry }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('no 422 mostra a mensagem da API, sem nova tentativa', () => {
    // Limite ou filtro inválido: tentar de novo falharia igual.
    const message =
      'O período tem registros demais para um relatório. Escolha um período menor.';
    const error = new ApiError({
      status: 422,
      code: 'REPORT_TOO_MANY_RECORDS',
      message,
    });
    renderState({ status: 'error', error, retry: vi.fn() });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.queryByText(resourceStateContent.error),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resourceStateContent.retry }),
    ).not.toBeInTheDocument();
  });
});

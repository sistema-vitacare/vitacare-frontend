import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResourceState from '../../src/components/ResourceState.jsx';
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

  it('mostra o erro com o botão de nova tentativa', () => {
    const retry = vi.fn();
    renderState({ status: 'error', error: new Error('falhou'), retry });

    expect(screen.getByText(resourceStateContent.error)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: resourceStateContent.retry }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

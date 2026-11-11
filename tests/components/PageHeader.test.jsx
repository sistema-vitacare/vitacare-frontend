import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import PageHeader from '../../src/components/PageHeader.jsx';

describe('PageHeader', () => {
  it('mostra o título principal, o subtítulo, a trilha e as ações', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Novo paciente"
          subtitle="Preencha os dados."
          breadcrumbs={[{ label: 'Pacientes', to: '/pacientes' }]}
          actions={<button type="button">Salvar</button>}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Novo paciente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preencha os dados.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pacientes' })).toHaveAttribute(
      'href',
      '/pacientes',
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});

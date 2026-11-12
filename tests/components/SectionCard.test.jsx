import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SectionCard from '../../src/components/SectionCard.jsx';

describe('SectionCard', () => {
  it('mostra o título, o subtítulo, a ação e o conteúdo', () => {
    render(
      <SectionCard
        title="Medicamentos ativos"
        subtitle="Os do paciente"
        action={<button type="button">Ver todos</button>}
      >
        <p>Losartana</p>
      </SectionCard>,
    );

    expect(
      screen.getByRole('heading', { name: 'Medicamentos ativos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Os do paciente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todos' })).toBeVisible();
    expect(screen.getByText('Losartana')).toBeInTheDocument();
  });

  it('não reserva espaço para subtítulo e ação ausentes', () => {
    render(
      <SectionCard title="Resumo">
        <p>Conteúdo</p>
      </SectionCard>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
  });
});

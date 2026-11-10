import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthLayout from '../../src/components/AuthLayout.jsx';
import { accessLayout } from '../../src/data/access.js';
import { theme } from '../../src/styles/theme.js';

function renderLayout(ui) {
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('AuthLayout', () => {
  it('mostra o título da tela como título principal, o subtítulo e o conteúdo', () => {
    renderLayout(
      <AuthLayout title="Entrar no VitaCare" subtitle="Use o código.">
        <p>Formulário</p>
      </AuthLayout>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Entrar no VitaCare' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Use o código.')).toBeInTheDocument();
    expect(screen.getByText('Formulário')).toBeInTheDocument();
  });

  it('apresenta a marca com a frase e os destaques', () => {
    renderLayout(<AuthLayout title="Entrar">conteúdo</AuthLayout>);

    expect(screen.getByText(accessLayout.brandTitle)).toBeInTheDocument();
    for (const highlight of accessLayout.highlights) {
      expect(screen.getByText(highlight)).toBeInTheDocument();
    }
  });
});

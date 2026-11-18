import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SeverityChip from '../../src/components/SeverityChip.jsx';
import { theme } from '../../src/styles/theme.js';

function renderChip(severity) {
  render(
    <ThemeProvider theme={theme}>
      <SeverityChip severity={severity} />
    </ThemeProvider>,
  );
}

describe('SeverityChip', () => {
  it.each([
    ['critical', 'Crítico', theme.palette.error],
    ['warning', 'Atenção', theme.palette.warning],
    ['info', 'Informativo', theme.palette.info],
  ])(
    'mostra %s pelo nome, na cor de estado sobre o fundo claro dela',
    (severity, label, tone) => {
      renderChip(severity);

      const chip = screen.getByText(label).closest('.MuiChip-root');
      const style = getComputedStyle(chip);
      // O jsdom devolve as cores em rgb().
      const rgb = (hex) =>
        `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
      expect(style.color).toBe(rgb(tone.main));
      expect(style.backgroundColor).toBe(rgb(tone.light));
    },
  );
});

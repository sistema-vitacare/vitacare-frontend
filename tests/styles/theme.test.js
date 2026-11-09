// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { theme } from '../../src/styles/theme.js';
import { contrastRatio } from '../support/contrast.js';

const { palette } = theme;

// Cada par é uma cor de texto e um fundo em que ela aparece na interface.
// 4,5:1 é o mínimo da WCAG 2.1, nível AA, para texto de tamanho normal.
const pairs = [
  [
    'texto do botão principal',
    palette.primary.contrastText,
    palette.primary.main,
  ],
  ['link sobre branco', palette.primary.main, palette.background.paper],
  ['item ativo do menu', palette.primary.dark, palette.primary.light],
  [
    'texto principal sobre branco',
    palette.text.primary,
    palette.background.paper,
  ],
  [
    'texto principal sobre o fundo',
    palette.text.primary,
    palette.background.default,
  ],
  [
    'texto secundário sobre branco',
    palette.text.secondary,
    palette.background.paper,
  ],
  [
    'texto secundário sobre o fundo',
    palette.text.secondary,
    palette.background.default,
  ],
  ['crítico sobre branco', palette.error.main, palette.background.paper],
  ['crítico sobre o próprio fundo', palette.error.main, palette.error.light],
  ['atenção sobre branco', palette.warning.main, palette.background.paper],
  [
    'atenção sobre o próprio fundo',
    palette.warning.main,
    palette.warning.light,
  ],
  ['informativo sobre branco', palette.info.main, palette.background.paper],
  ['informativo sobre o próprio fundo', palette.info.main, palette.info.light],
  ['normal sobre branco', palette.success.main, palette.background.paper],
  ['normal sobre o próprio fundo', palette.success.main, palette.success.light],
  [
    'texto claro sobre o azul-marinho',
    palette.brand.onNavy,
    palette.brand.navy,
  ],
  [
    'texto secundário sobre o azul-marinho',
    palette.brand.onNavyMuted,
    palette.brand.navy,
  ],
];

describe('tema', () => {
  it.each(pairs)(
    '%s tem contraste de pelo menos 4,5:1',
    (_, text, background) => {
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('usa o teal #0D7D77 como cor de ação', () => {
    expect(palette.primary.main).toBe('#0D7D77');
  });
});

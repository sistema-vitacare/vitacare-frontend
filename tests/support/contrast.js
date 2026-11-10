// Contraste pela fórmula da WCAG 2.1: (L1 + 0,05) / (L2 + 0,05), com L1 a
// luminância relativa da cor mais clara.
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) =>
    channel(parseInt(value.slice(i, i + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(colorA, colorB) {
  const [lighter, darker] = [luminance(colorA), luminance(colorB)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

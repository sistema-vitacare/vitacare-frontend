// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appInfo } from '../src/data/app.js';
import { theme } from '../src/styles/theme.js';

const read = (path, encoding) =>
  readFileSync(new URL(`../${path}`, import.meta.url), encoding);

const manifest = JSON.parse(read('public/manifest.webmanifest', 'utf8'));
const indexHtml = read('index.html', 'utf8');

// Largura e altura gravadas no cabeçalho do PNG (bloco IHDR, logo depois da
// assinatura de 8 bytes). O navegador descarta o ícone cujo tamanho não bate
// com o declarado no manifesto.
function pngSize(publicPath) {
  const bytes = read(`public${publicPath}`);
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

function headLink(rel) {
  return indexHtml.match(
    new RegExp(`<link\\s+rel="${rel}"\\s+href="([^"]+)"`),
  )?.[1];
}

describe('manifesto', () => {
  it('identifica o aplicativo com o nome, a descrição e as cores do tema', () => {
    expect(manifest).toMatchObject({
      name: appInfo.name,
      short_name: appInfo.name,
      description: appInfo.description,
      lang: 'pt-BR',
      start_url: '/',
      display: 'standalone',
      theme_color: theme.palette.primary.main,
      background_color: theme.palette.background.default,
    });
  });

  it('declara os ícones de 192 e 512 px e o recortável, cada um no tamanho do arquivo', () => {
    expect(
      manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose ?? 'any'}`),
    ).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });
});

describe('index.html', () => {
  it('liga o manifesto, a cor da barra do navegador e o ícone do iPhone', () => {
    expect(headLink('manifest')).toBe('/manifest.webmanifest');
    expect(indexHtml).toMatch(
      new RegExp(
        `<meta\\s+name="theme-color"\\s+content="${theme.palette.primary.main}"`,
      ),
    );
    expect(pngSize(headLink('apple-touch-icon'))).toBe('180x180');
  });
});

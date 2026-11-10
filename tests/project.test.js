// @vitest-environment node
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  findHardcodedColors,
  findMarker,
  findUndocumented,
  listFiles,
  listSrcEntries,
  parseDocumentedPaths,
} from './support/projectChecks.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

describe('projeto', () => {
  it('documenta na tabela Estrutura do README cada arquivo solto e cada pasta de src até dois níveis', () => {
    const readme = readFileSync(
      new URL('../README.md', import.meta.url),
      'utf8',
    );

    expect(
      findUndocumented(
        listSrcEntries(projectRoot),
        parseDocumentedPaths(readme),
      ),
    ).toEqual([]);
  });

  it('não tem o marcador TODO_PREENCHER em src', () => {
    const srcDir = fileURLToPath(new URL('../src', import.meta.url));
    const files = listFiles(srcDir).map((path) => ({
      path,
      content: readFileSync(path, 'utf8'),
    }));

    expect(findMarker(files, 'TODO_PREENCHER')).toEqual([]);
  });

  it('não usa cor fixa em src fora de src/styles', () => {
    const srcDir = fileURLToPath(new URL('../src', import.meta.url));
    const files = listFiles(srcDir)
      .filter((path) => relative(srcDir, path).split(sep)[0] !== 'styles')
      .map((path) => ({ path, content: readFileSync(path, 'utf8') }));

    expect(findHardcodedColors(files)).toEqual([]);
  });
});

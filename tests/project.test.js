// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
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
});

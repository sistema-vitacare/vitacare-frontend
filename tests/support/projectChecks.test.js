// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findMarker,
  findUndocumented,
  listFiles,
  listSrcEntries,
  parseDocumentedPaths,
} from './projectChecks.js';

const tempDirs = [];

function createTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'vitacare-'));
  tempDirs.push(root);
  for (const file of files) {
    const fullPath = join(root, file);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, '');
  }
  return root;
}

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('listSrcEntries', () => {
  it('lista os arquivos soltos em src e as pastas até dois níveis', () => {
    const root = createTree([
      'src/main.jsx',
      'src/App.jsx',
      'src/data/app.js',
      'src/pages/Login/LoginPage.jsx',
      'src/pages/Login/parts/LoginForm.jsx',
    ]);

    expect(listSrcEntries(root)).toEqual([
      'src/App.jsx',
      'src/data/',
      'src/main.jsx',
      'src/pages/',
      'src/pages/Login/',
    ]);
  });
});

describe('parseDocumentedPaths', () => {
  it('considera só a primeira coluna da tabela da seção Estrutura', () => {
    const readme = [
      '# Projeto',
      '',
      '## Estrutura',
      '',
      'Texto citando `src/inline/`, que não conta.',
      '',
      '| Caminho | Conteúdo |',
      '| --- | --- |',
      '| `src/data/` | Dados. |',
      '| `src/main.jsx` | Entrada, ao lado de `src/coluna2/`. |',
      '',
      '## Documentação',
      '',
      '| `src/outra-secao/` | Fora da seção Estrutura. |',
    ].join('\n');

    expect([...parseDocumentedPaths(readme)].sort()).toEqual([
      'src/data/',
      'src/main.jsx',
    ]);
  });

  it('devolve conjunto vazio quando o README não tem a seção Estrutura', () => {
    expect(parseDocumentedPaths('# Projeto\n\n## Documentação\n').size).toBe(0);
  });
});

describe('findUndocumented', () => {
  it('não acusa nada quando tudo está documentado', () => {
    const documented = new Set(['src/data/', 'src/main.jsx']);

    expect(findUndocumented(['src/data/', 'src/main.jsx'], documented)).toEqual(
      [],
    );
  });

  it('acusa a pasta que não tem linha no README', () => {
    const documented = new Set(['src/data/']);

    expect(findUndocumented(['src/data/', 'src/hooks/'], documented)).toEqual([
      'src/hooks/',
    ]);
  });
});

describe('listFiles', () => {
  it('lista os arquivos de todas as subpastas', () => {
    const root = createTree(['a.js', 'sub/b.js', 'sub/deep/c.js']);

    const files = listFiles(root)
      .map((file) => relative(root, file).split(sep).join('/'))
      .sort();

    expect(files).toEqual(['a.js', 'sub/b.js', 'sub/deep/c.js']);
  });
});

describe('findMarker', () => {
  it('não acusa arquivo sem o marcador', () => {
    const files = [{ path: 'src/a.js', content: 'export const a = 1;\n' }];

    expect(findMarker(files, 'TODO_PREENCHER')).toEqual([]);
  });

  it('indica o arquivo e a linha de cada ocorrência', () => {
    const files = [
      {
        path: 'src/a.js',
        content: 'const a = 1;\nconst b = "TODO_PREENCHER";\n',
      },
      { path: 'src/b.js', content: 'const c = 2;\n' },
    ];

    expect(findMarker(files, 'TODO_PREENCHER')).toEqual([
      { path: 'src/a.js', line: 2 },
    ]);
  });
});

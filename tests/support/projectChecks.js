import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Arquivos soltos na raiz de `src/` e pastas até dois níveis
 * (`src/pages/` e `src/pages/Login/`), no formato usado no README.
 * O terceiro nível fica de fora para que a tabela "Estrutura" continue
 * sendo um mapa do projeto, e não uma lista de cada arquivo.
 */
export function listSrcEntries(projectRoot) {
  const srcDir = join(projectRoot, 'src');
  const entries = [];

  for (const item of readdirSync(srcDir, { withFileTypes: true })) {
    if (item.isFile()) {
      entries.push(`src/${item.name}`);
    } else if (item.isDirectory()) {
      entries.push(`src/${item.name}/`);
      for (const child of readdirSync(join(srcDir, item.name), {
        withFileTypes: true,
      })) {
        if (child.isDirectory()) {
          entries.push(`src/${item.name}/${child.name}/`);
        }
      }
    }
  }

  return entries.sort();
}

/**
 * Caminhos da primeira coluna da tabela da seção "Estrutura" do README.
 * Menções em texto corrido ou em outras seções não contam como documentação.
 */
export function parseDocumentedPaths(readme) {
  const section = readme
    .split(/^## /m)
    .find((part) => part.startsWith('Estrutura'));
  if (!section) {
    return new Set();
  }

  const firstColumnPath = /^\|\s*`([^`]+)`\s*\|/gm;
  return new Set(
    [...section.matchAll(firstColumnPath)].map((match) => match[1]),
  );
}

export function findUndocumented(entries, documented) {
  return entries.filter((entry) => !documented.has(entry));
}

export function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

export function findMarker(files, marker) {
  return files.flatMap(({ path, content }) =>
    content
      .split('\n')
      .flatMap((text, index) =>
        text.includes(marker) ? [{ path, line: index + 1 }] : [],
      ),
  );
}

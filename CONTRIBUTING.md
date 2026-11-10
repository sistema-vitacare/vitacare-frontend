# Como contribuir

Este guia define como o código entra no repositório: branches, mensagens de commit, pull requests, padrões de código e documentação.

## Branches

| Branch | Função |
| --- | --- |
| `main` | Versão estável. Recebe a `develop` uma vez, quando todas as telas estão prontas (fim do Bloco 7). |
| `develop` | Integração. Todo trabalho novo sai dela e volta para ela por pull request. |
| `bloco-N-assunto` | Uma por bloco de telas do backlog: número do bloco e um resumo curto, em minúsculas e separado por hífens. Os cards do bloco entram nela como commits. Exemplo: `bloco-2-pacientes`. |
| `fe-NN-assunto` | Uma por card de fundação ou de manutenção, que não pertence a um bloco: identificador do card e um resumo curto. Exemplo: `fe-31-alerta-minimatch`. |

Para começar um bloco:

```bash
git checkout develop
git pull origin develop
git checkout -b bloco-2-pacientes
```

## Mensagens de commit

- Uma linha em português, com acentuação correta, específica o bastante para dispensar a leitura do diff.
- Verbo no presente, na terceira pessoa: "Cria", "Corrige", "Ajusta", "Remove".
- Corpo apenas quando a linha não explica tudo, separado dela por uma linha em branco.
- Sem prefixo de tipo (`feat:`, `fix:`) e sem trailers.
- Um commit por etapa. Cada etapa corresponde a um conjunto próprio de arquivos, para que o `git add` de uma etapa não leve junto a seguinte.

| Evite | Prefira |
| --- | --- |
| `ajustes` | `Ajusta o espaçamento da tabela de pacientes no celular` |
| `tela de login` | `Cria a tela de login com código da organização, e-mail e senha` |
| `fix` | `Corrige a máscara de CPF que aceitava letras` |

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com recarga automática. |
| `npm run build` | Gera a versão de produção em `dist/`. |
| `npm run preview` | Serve localmente o conteúdo de `dist/`. |
| `npm run lint` | ESLint sem tolerância a avisos e conferência de formatação pelo Prettier. |
| `npm run format` | Formata os arquivos pelo Prettier. Arquivos Markdown ficam de fora. |
| `npm test` | Roda todos os testes uma vez. |
| `npm run verify` | Lint, testes e build, nessa ordem; para no primeiro erro. |

O `npm run verify` precisa terminar sem erro antes da abertura do pull request. O GitHub Actions roda o mesmo comando, no check `verify`, em todo pull request e push para `develop` e `main`.

## Testes

- Os testes usam Vitest e Testing Library e ficam em `tests/`, espelhando as pastas de `src/`, com o nome do arquivo testado seguido de `.test.js` ou `.test.jsx`.
- Telas são testadas pelo que o usuário vê: textos, papéis acessíveis (`getByRole`) e o resultado das interações.
- Lógica é escrita com o teste antes do código. O primeiro teste roda contra uma função que devolve um valor neutro, e só os casos do comportamento novo podem falhar.
- Três verificações de projeto rodam junto com os testes: todo arquivo solto em `src/` e toda pasta de `src/` até dois níveis precisam de linha na tabela "Estrutura" do README; o marcador `TODO_PREENCHER`, usado para conteúdo ainda não definido, não pode aparecer em `src/`; e nenhuma cor fixa (hexadecimal, `rgb` ou `hsl`) pode aparecer em `src/` fora de `src/styles/`.

## Pull requests

- Título de um bloco: número, nome e intervalo de cards. Exemplo: `Bloco 2 — Pacientes (FE-11 a FE-15)`.
- Título de um card fora de bloco: identificador do card e o que ele entrega. Exemplo: `FE-31 — Alerta do minimatch na cadeia do ESLint`.
- Corpo: o que muda, como foi verificado e o que ficou de fora.
- Destino: `develop`. A `main` recebe apenas a `develop`, num pull request aberto quando todas as telas estão prontas.
- Merge só com o check `verify` verde.
- Merge pela opção "Create a merge commit". As opções de squash e rebase reescrevem os commits da branch, e o squash junta todos em um só.

## Código

- Nomes de arquivos, variáveis, funções e componentes em inglês.
- Comentários, mensagens de teste e descrições de `describe` e `it` em português.
- Comentário explica o porquê do trecho e o que quebra sem ele, não o que a linha faz.
- Cores, raios e sombras vêm do tema, em `src/styles/theme.js`. Espaçamento usa a escala do tema no `sx` (`p: 2`, `gap: 1.5`), nunca valor em pixels.

## Documentação

- Português correto, em linguagem técnica e impessoal.
- O texto descreve o sistema como ele é. Menção a uma versão anterior só permanece quando evita um erro que ainda pode acontecer.
- A documentação afetada por uma mudança é atualizada no mesmo pull request da mudança.

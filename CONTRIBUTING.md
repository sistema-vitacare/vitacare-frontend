# Como contribuir

Este guia define como o código entra no repositório: branches, mensagens de commit, pull requests, padrões de código e documentação.

## Branches

| Branch | Função |
| --- | --- |
| `main` | Versão estável. Recebe a `develop` quando um bloco de telas é concluído. |
| `develop` | Integração. Todo trabalho novo sai dela e volta para ela por pull request. |
| `fe-NN-assunto` | Uma por card do backlog: identificador do card e um resumo curto, em minúsculas e separado por hífens. Exemplo: `fe-11-lista-pacientes`. |

Para começar um card:

```bash
git checkout develop
git pull origin develop
git checkout -b fe-11-lista-pacientes
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
| `npm run verify` | Lint e build, nessa ordem; para no primeiro erro. |

O `npm run verify` precisa terminar sem erro antes da abertura do pull request.

## Pull requests

- Título: identificador do card e o que ele entrega. Exemplo: `FE-11 — Listagem de pacientes`.
- Corpo: o que muda, como foi verificado e o que ficou de fora.
- Destino: `develop`. A `main` recebe apenas a `develop`.
- Merge pela opção "Create a merge commit". As opções de squash e rebase reescrevem os commits da branch, e o squash junta todos em um só.

## Código

- Nomes de arquivos, variáveis, funções e componentes em inglês.
- Comentários, mensagens de teste e descrições de `describe` e `it` em português.
- Comentário explica o porquê do trecho e o que quebra sem ele, não o que a linha faz.

## Documentação

- Português correto, em linguagem técnica e impessoal.
- O texto descreve o sistema como ele é. Menção a uma versão anterior só permanece quando evita um erro que ainda pode acontecer.
- A documentação afetada por uma mudança é atualizada no mesmo pull request da mudança.

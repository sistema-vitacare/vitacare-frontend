# VitaCare — Frontend

Interface web do VitaCare, sistema para gestão e monitoramento de doenças crônicas e cuidado a idosos, desenvolvido como Trabalho de Conclusão de Curso de Engenharia de Software da Universidade de Ribeirão Preto (UNAERP).

A aplicação é um PWA responsivo, construído com React e Material UI, que consome a API do [vitacare-backend](https://github.com/sistema-vitacare/vitacare-backend).

## Situação atual

As telas são construídas com dados simulados, servidos por uma camada de serviços que reproduz o formato de resposta da API. Quando todas as telas estiverem prontas, a integração com o backend substitui a implementação dessa camada, sem alterar as telas.

## Como rodar

Requisitos: Node.js 24.15 ou superior (a versão de referência está no `.nvmrc`) e npm.

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento abre em `http://localhost:5173`. Os demais scripts estão descritos no [guia de contribuição](CONTRIBUTING.md#scripts).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `.github/workflows/` | Integração contínua: lint, testes e build em cada pull request. |
| `docs/` | Documentação técnica. |
| `public/` | Arquivos servidos sem processamento, como o ícone da aba. |
| `index.html` | Página base carregada pelo Vite. |
| `src/main.jsx` | Ponto de entrada: monta a aplicação na página. |
| `src/App.jsx` | Componente raiz. |
| `src/data/` | Textos da interface e dados simulados. |
| `tests/` | Testes automatizados, espelhando as pastas de `src/`. |
| `tests/support/` | Verificações de projeto usadas pelos testes. |

Todo arquivo solto em `src/` e toda pasta de `src/` até dois níveis precisam de uma linha nesta tabela; um teste falha quando falta alguma.

## Documentação

- [Arquitetura](docs/arquitetura.md): tecnologias, camadas, dados simulados, perfis de acesso e identidade visual.
- [Como contribuir](CONTRIBUTING.md): branches, mensagens de commit, pull requests e documentação.

## Equipe

- Enzo Shimada Daun
- Mateus Mendonça de Ávila
- Miguel Ribas Berlese

Orientador: Prof. Me. Carlos Alves da Silva.

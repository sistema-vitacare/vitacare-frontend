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

Em produção, o frontend roda na VPS como um container nginx na porta 1040, publicado a cada merge na `main`. Para ensaiar a imagem de produção localmente, `docker compose up --build` abre em `http://localhost:1040`. O roteiro completo está em [Deploy na VPS](docs/deploy-vps.md).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `.github/workflows/` | Integração contínua e deploy: lint, testes, build e smoke da imagem em cada pull request; publicação em produção a cada push na `main`. |
| `docker/` | Configuração do nginx da imagem de produção e validação do ambiente na subida do container. |
| `docs/` | Documentação técnica. |
| `public/` | Arquivos servidos sem processamento, como o ícone da aba, o símbolo do logotipo e o `config.js` de desenvolvimento. |
| `scripts/ops/` | Smoke da imagem de produção, usado no CI e no ensaio local. |
| `Dockerfile` | Imagem de produção: build do Vite com Node e entrega com nginx sem root. |
| `docker-compose.prod.yml` | Stack do Portainer na VPS, na porta 1040. |
| `compose.yaml` | Ensaio local da imagem de produção. |
| `.env.production.example` | Modelo das variáveis da stack de produção. |
| `index.html` | Página base carregada pelo Vite. |
| `src/main.jsx` | Ponto de entrada: monta a aplicação na página. |
| `src/App.jsx` | Componente raiz: cria o roteador a partir da árvore de rotas. |
| `src/routes.jsx` | Árvore de rotas: layout, proteções por sessão e permissão e página de cada endereço. |
| `src/components/` | Componentes usados em mais de um lugar, como o layout autenticado, o layout das telas de acesso, o provedor de sessão e as proteções por sessão e por permissão. |
| `src/constants/` | Listas fechadas, como os endereços do sistema, os itens do menu e a matriz de permissões dos perfis. |
| `src/data/` | Textos da interface. |
| `src/data/mocks/` | Dados simulados de organização, usuários, pacientes e credenciais de demonstração, no formato da API. |
| `src/pages/` | Telas, uma pasta por tela. |
| `src/pages/Login/` | Entrada no sistema. |
| `src/pages/PasswordRecovery/` | Pedido de recuperação de senha. |
| `src/pages/PasswordReset/` | Redefinição da senha pelo link de recuperação. |
| `src/pages/FirstAccess/` | Troca obrigatória da senha provisória no primeiro acesso. |
| `src/pages/Status/` | Páginas de não encontrada, acesso negado, erro inesperado e tela em construção. |
| `src/hooks/` | Hooks que ligam as telas aos serviços, como o `useResource`, para leitura, e o `useSubmit`, para envio. |
| `src/services/` | Único ponto de acesso a dados; hoje responde com os dados simulados. |
| `src/styles/` | Tema do Material UI: cores, tipografia, raios, sombras e movimento. |
| `src/utils/` | Funções puras, como a validação de CPF, a validação dos campos de acesso e as iniciais do avatar. |
| `tests/` | Testes automatizados, espelhando as pastas de `src/`. |
| `tests/support/` | Verificações de projeto usadas pelos testes. |

Todo arquivo solto em `src/` e toda pasta de `src/` até dois níveis precisam de uma linha nesta tabela; um teste falha quando falta alguma.

## Documentação

- [Arquitetura](docs/arquitetura.md): tecnologias, camadas, dados simulados, perfis de acesso e identidade visual.
- [Deploy na VPS](docs/deploy-vps.md): imagem, stack do Portainer, configuração, segurança e operação em produção.
- [Como contribuir](CONTRIBUTING.md): branches, mensagens de commit, pull requests e documentação.

## Equipe

- Enzo Shimada Daun
- Mateus Mendonça de Ávila
- Miguel Ribas Berlese

Orientador: Prof. Me. Carlos Alves da Silva.

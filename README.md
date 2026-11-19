# VitaCare — Frontend

Interface web do VitaCare, sistema para gestão e monitoramento de doenças crônicas e cuidado a idosos, desenvolvido como Trabalho de Conclusão de Curso de Engenharia de Software da Universidade de Ribeirão Preto (UNAERP).

A aplicação é um PWA responsivo, construído com React e Material UI, que consome a API do [vitacare-backend](https://github.com/sistema-vitacare/vitacare-backend).

## Situação atual

Todas as telas estão prontas, e a integração com a API do backend está em andamento. O acesso (login, sessão, termo de uso, aceite do convite, primeiro acesso, recuperação e troca de senha) usa a API; as demais áreas ainda leem dados simulados, servidos pela camada de serviços no formato de resposta da API. A integração de cada área troca o corpo dos serviços dela pelas chamadas à API, sem alterar as telas.

## Como rodar

Requisitos: Node.js 24.15 ou superior (a versão de referência está no `.nvmrc`) e npm.

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento abre em `http://localhost:5173`. Os demais scripts estão descritos no [guia de contribuição](CONTRIBUTING.md#scripts).

O login usa a API, que no desenvolvimento é a do [vitacare-backend](https://github.com/sistema-vitacare/vitacare-backend) rodando na mesma máquina, em `http://localhost:3000`, o endereço do `public/config.js`. O README do backend descreve como subir a API, com PostgreSQL, Redis, as migrations e a base mínima do `npm run seed:dev`. Com `CORS_ORIGINS` vazio, a API de desenvolvimento aceita qualquer origem. O primeiro login de cada conta pede o aceite do termo de uso. Sem a API no ar, o login mostra que não foi possível falar com o servidor. A API de produção não serve ao desenvolvimento: ela envia e-mails de verdade, como o convite e a recuperação de senha.

Em produção, o frontend roda na VPS como um container nginx na porta 1040, publicado a cada merge na `main` e servido em `https://vitacare.bizys.com.br` pelo Nginx Proxy Manager. Para ensaiar a imagem de produção localmente, `docker compose up --build` abre em `http://localhost:1040`. O roteiro completo está em [Deploy na VPS](docs/deploy-vps.md).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `.github/workflows/` | Integração contínua e deploy: lint, testes, build e smoke da imagem em cada pull request; publicação em produção a cada push na `main`. |
| `docker/` | Configuração do nginx da imagem de produção e validação do ambiente na subida do container. |
| `docs/` | Documentação técnica. |
| `public/` | Arquivos servidos sem processamento, como o ícone da aba, o símbolo do logotipo, o manifesto de instalação com os ícones em `icons/` (feitos do símbolo do logotipo) e o `config.js` de desenvolvimento. |
| `scripts/ops/` | Smoke da imagem de produção, usado no CI e no ensaio local. |
| `Dockerfile` | Imagem de produção: build do Vite com Node e entrega com nginx sem root. |
| `docker-compose.prod.yml` | Stack do Portainer na VPS, na porta 1040. |
| `compose.yaml` | Ensaio local da imagem de produção. |
| `.env.production.example` | Modelo das variáveis da stack de produção. |
| `index.html` | Página base carregada pelo Vite, com o manifesto, o ícone do iPhone e a cor da barra do navegador. |
| `src/main.jsx` | Ponto de entrada: monta a aplicação na página e recarrega a página quando o arquivo de uma tela não carrega depois de um deploy. |
| `src/App.jsx` | Componente raiz: cria o roteador a partir da árvore de rotas. |
| `src/routes.jsx` | Árvore de rotas: layout, proteções por sessão e permissão, página de cada endereço e a barra de carregamento enquanto a tela chega. |
| `src/lazyPages.js` | Telas carregadas sob demanda, cada uma num arquivo à parte do build. |
| `src/components/` | Componentes usados em mais de um lugar, como o layout autenticado, o layout das telas de acesso, o cabeçalho de página, o cartão de seção, a lista de rótulos e valores, os estados de carregamento, vazio e erro, a escolha do paciente das listas por paciente, a lista e os filtros dos registros de acompanhamento, os campos de período, o cartão de uma série de evolução, o selo de severidade, o diálogo de confirmação, a troca da própria senha, a edição dos dados de uma organização, o campo da senha provisória com Copiar, o resumo do plano com o uso, a região rolável com foco pelo teclado, o link do termo de uso no rodapé, o provedor de sessão e as proteções por sessão e por permissão. |
| `src/constants/` | Listas fechadas, como os endereços do sistema, os itens do menu, a matriz de permissões dos perfis, os tipos de campo dos formulários, as unidades e vias dos medicamentos, as severidades, origens e operadores dos alertas, os atalhos de período do painel, os perfis e situações dos usuários, os recursos dos planos e as gravidades da auditoria. |
| `src/data/` | Textos da interface. |
| `src/data/mocks/` | Dados simulados das áreas ainda não integradas, no formato da API: organização, organizações clientes com termo de vigência, uso e solicitação de mudança de plano, planos e termo de vigência, usuários, pacientes, vínculos de cuidado, formulários com versões e rascunho, registros, anexos, medicamentos, regras de alerta, alertas, catálogo e eventos de auditoria e a página fixa do PDF do relatório. |
| `src/pages/` | Telas, uma pasta por tela. |
| `src/pages/Login/` | Entrada no sistema. |
| `src/pages/Patients/` | Pacientes: listagem, cadastro e edição, detalhe com a equipe de cuidado e histórico com a evolução. |
| `src/pages/Forms/` | Formulários de acompanhamento: lista e página do formulário, com os dados, os campos por seção, o rascunho, a publicação, a situação e as regras de alerta. |
| `src/pages/FollowUps/` | Registros de acompanhamento: registro de visita, lista por paciente e detalhe com os alertas gerados, os anexos e a anulação. |
| `src/pages/Medications/` | Medicamentos do paciente: cartões com a agenda e o horário coincidente, cadastro e edição, inativação e reativação. |
| `src/pages/Alerts/` | Alertas do paciente: contadores por severidade, abas, detalhe de cada origem e resolução. |
| `src/pages/Dashboard/` | Painel operacional da organização: indicadores, registros por dia, alertas prioritários, últimos registros e detalhe de cada indicador. |
| `src/pages/Users/` | Usuários da organização: lista com contadores por perfil, cadastro por convite, página do usuário, perfil, situação, convite e senha provisória. |
| `src/pages/Reports/` | Relatórios: tipos disponíveis, relatório do paciente por período, relatórios gerenciais de alertas e de atividade dos cuidadores, exportação em PDF e relatórios recentes. |
| `src/pages/Audit/` | Trilha de auditoria: lista com filtros, detalhe do evento e exportação em CSV. |
| `src/pages/Settings/` | Configurações da organização: dados cadastrais, plano e uso e solicitação de mudança de plano. |
| `src/pages/Organizations/` | Organizações clientes, para o administrador da plataforma: lista com as solicitações de mudança de plano em análise, cadastro com o primeiro administrador e página da organização com os dados, a situação e o plano. |
| `src/pages/PasswordRecovery/` | Pedido de recuperação de senha. |
| `src/pages/PasswordReset/` | Redefinição da senha pelo link de recuperação. |
| `src/pages/FirstAccess/` | Troca obrigatória da senha provisória no primeiro acesso. |
| `src/pages/Terms/` | Termo de uso e privacidade vigente, com o aceite que libera a sessão. |
| `src/pages/InvitationAccept/` | Aceite do convite pelo link do e-mail, com a senha criada pelo convidado. |
| `src/pages/Status/` | Páginas de não encontrada, acesso negado, erro inesperado e tela em construção. |
| `src/hooks/` | Hooks que ligam as telas aos serviços: o `useResource`, para leitura, o `useSubmit`, para envio, e os filtros do painel e dos relatórios guardados no endereço. |
| `src/services/` | Único ponto de acesso a dados: o cliente HTTP da API e os serviços de cada área; os das áreas ainda não integradas respondem com os dados simulados. |
| `src/styles/` | Tema do Material UI: cores, tipografia, raios, sombras e movimento. |
| `src/utils/` | Funções puras: validações (CPF, campos de acesso, cadastro de paciente, usuário e organização, inclusive a nova com o primeiro administrador), regras dos campos de formulário, das respostas de registro, dos anexos, dos medicamentos e das regras de alerta, a agenda dos medicamentos, as mensagens dos alertas, a regra de período da API, as contas do painel e dos relatórios gerenciais, as ações de cada usuário, o aviso de vencimento do plano, as regras do termo do plano (limites, data de fim e motivo), a senha provisória, o CSV da auditoria e o endereço do item de um evento, a entrega de arquivo baixado, a recarga da página depois de um deploy, a origem da API lida do `/config.js`, a leitura do texto do termo de uso, o PDF fixo do relatório simulado, máscaras, números digitados com vírgula, formatação de datas e doses e os indicadores de evolução. |
| `tests/` | Testes automatizados, espelhando as pastas de `src/`. |
| `tests/support/` | Apoio dos testes: stub da API, sessões dos usuários de demonstração no formato do login da API, verificações de projeto, cálculo de contraste, largura de tela simulada, renderização de telas com a sessão do perfil e carga das telas sob demanda antes dos testes do roteador. |

Todo arquivo solto em `src/` e toda pasta de `src/` até dois níveis precisam de uma linha nesta tabela; um teste falha quando falta alguma.

## Documentação

- [Arquitetura](docs/arquitetura.md): tecnologias, camadas, acesso à API, dados simulados, perfis de acesso e identidade visual.
- [Deploy na VPS](docs/deploy-vps.md): imagem, stack do Portainer, configuração, segurança e operação em produção.
- [Como contribuir](CONTRIBUTING.md): branches, mensagens de commit, pull requests e documentação.

## Equipe

- Enzo Shimada Daun
- Mateus Mendonça de Ávila
- Miguel Ribas Berlese

Orientador: Prof. Me. Carlos Alves da Silva.

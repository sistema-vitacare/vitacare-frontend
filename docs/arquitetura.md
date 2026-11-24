# Arquitetura do frontend

Este documento descreve como o frontend do VitaCare é construído: tecnologias, camadas, acesso à API, dados simulados, controle de acesso por perfil, identidade visual, acessibilidade e instalação.

As regras de negócio e a proteção dos dados pertencem à API. O frontend apresenta as informações e oculta o que o perfil não pode fazer, mas isso é apenas interface: a autorização acontece no backend.

## Tecnologias

| Tecnologia | Uso | Motivo |
| --- | --- | --- |
| React 19, em JavaScript (JSX) | Interface em componentes | Definido no TCC (Quadro 24). |
| Material UI 9 | Componentes visuais e tema | Definido no TCC (Quadro 24). |
| MUI X Charts | Gráficos de evolução e do painel | Usa o mesmo tema do Material UI, sem um segundo sistema de estilos. |
| React Router 8 | Rotas | Permite proteger cada rota por permissão. |
| Vite 8 | Servidor de desenvolvimento e build | Configuração mínima para React. |
| Vitest 5 e Testing Library | Testes | O Vitest reaproveita a configuração do Vite; a Testing Library testa o que o usuário vê. |
| Phosphor Icons | Ícones | Conjunto com traço uniforme, licença MIT. |
| Plus Jakarta Sans | Tipografia | Fonte variável com algarismos tabulares, que alinham valores numéricos em tabelas e cartões; licença OFL. |
| nginx 1.30, em imagem Docker sem root | Entrega do build em produção | Serve os arquivos estáticos com cache, compressão e cabeçalhos de segurança, sem Node na imagem final. |

O ambiente usa Node.js 24, com versão mínima 24.15, exigida pelo jsdom dos testes.

Em produção, o frontend roda na VPS do backend, num container na porta 1040, publicado com HTTPS em `https://vitacare.bizys.com.br` pelo Nginx Proxy Manager, e não na Vercel prevista no TCC. Cada merge na `main` publica uma imagem nova pelo GitHub Actions e pelo Portainer. O endereço da API chega ao app em tempo de execução, por `window.__VITACARE_CONFIG__.apiUrl` (`/config.js`), e não no build. Detalhes em [Deploy na VPS](deploy-vps.md).

## Camadas

As dependências seguem um único sentido: páginas, hooks, serviços, dados.

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Páginas | `src/pages/` | Uma pasta por tela. Montam o layout e tratam os estados de carregamento, vazio e erro. |
| Componentes | `src/components/` | Peças usadas em duas ou mais telas. Um trecho vira componente a partir da segunda repetição. |
| Hooks | `src/hooks/` | Chamam os serviços e entregam dados e estado às páginas. |
| Serviços | `src/services/` | Único ponto de acesso a dados: chamam a API pelo cliente HTTP ou, enquanto a área não é integrada, respondem com os dados simulados. |
| Dados | `src/data/` | Textos da interface e dados simulados. Nenhum texto, lista ou valor fica fixo dentro de componente. |
| Constantes | `src/constants/` | Rotas, permissões e listas fechadas, como severidades, unidades de dose e tipos de campo. |
| Estilos | `src/styles/` | Tema do Material UI: cores, tipografia, espaçamentos, raios, sombras e movimento. |
| Utilitários | `src/utils/` | Funções puras: máscaras, formatação de datas, cálculo de idade. |

## Acesso à API

O cliente HTTP (`src/services/apiClient.js`) é o único ponto que fala com a API. Ele monta o endereço com a origem do `/config.js` e o prefixo `/api/v1`, envia o token da sessão no cabeçalho `Authorization: Bearer` (menos nas rotas públicas, como o login), devolve o corpo de sucesso como `{ data, meta }` e transforma o corpo `{ error, meta }` num `ApiError`, com `status`, `code`, `message`, `detail` e `fields`. A falha sem resposta da API (rede, CORS ou servidor fora do ar) chega às telas como erro com nova tentativa, de código `NETWORK_ERROR`. Arquivos gerados pela API (PDF, CSV e anexo) chegam por `apiDownload`, com o nome lido de `Content-Disposition`, e o anexo vai por `apiUpload`, em `multipart/form-data`. A tela salva o arquivo baixado pelo `saveFile`, sem abri-lo dentro do aplicativo.

Duas respostas mudam a sessão, venham da tela que vierem:

- `401` numa chamada que levava o token da sessão quer dizer que a API encerrou a sessão: logout em outra aba, troca de senha, inatividade de 30 minutos, usuário ou organização inativados. A sessão acaba, e o login mostra o aviso de sessão expirada. O login responde `401` à credencial errada sem token, e isso não encerra nada;
- `403 TERMS_ACCEPTANCE_REQUIRED` quer dizer que há uma versão do termo de uso ainda não aceita, inclusive uma publicada com a sessão aberta: a sessão passa ao estado `terms`, e as telas levam ao termo.

Os valores que entram numa rota, como um id vindo do endereço da tela, passam por `apiPath`, que os escapa: um id forjado como `../users/<id>` vira um id só, que a API recusa, em vez de levar a chamada, com o token da sessão, a outra rota.

Quando uma listagem vem vazia com `meta.message` (a orientação a quem não tem vínculo, o aviso de busca sem resultado), o `ResourceState` mostra a mensagem da API no lugar do texto da tela; sem ela, vale o texto da tela. O detalhe e o histórico do paciente fazem o mesmo na visão consolidada sem registro e na evolução sem medição.

A edição do paciente envia só os campos alterados, comparados com o paciente carregado; sem alteração, a tela avisa e não chama a API. Mandar o cadastro inteiro traria de volta, em silêncio, um responsável que outra pessoa trocou durante a edição. A API não tem controle de versão, então duas edições do mesmo campo continuam valendo pelo último salvamento.

A integração anda por área: o corpo de cada serviço passa a chamar as rotas da API, e páginas e hooks não mudam. Enquanto uma área não é integrada, os serviços dela respondem com os dados simulados descritos abaixo.

## Dados simulados

Os serviços ainda não integrados respondem no mesmo formato da API do backend. O utilitário `src/services/mockApi.js` monta essas respostas:

- sucesso: `{ data, meta }`, com `meta.requestId` e `meta.timestamp`;
- listagem: `meta.pagination` com `page`, `limit`, `total` e `totalPages`, página 1 e limite 20 quando não informados, como na API;
- erro: o mesmo `ApiError` do cliente HTTP, então as telas tratam erro do mesmo jeito nas áreas simuladas e nas integradas.

Cada requisição simulada espera um atraso curto, zerado nos testes. A função `failNextRequest` faz a próxima requisição falhar, para exercitar os estados de erro das telas.

Os serviços simulados sabem quem consulta pela sessão da API que o `authService` guarda (`currentViewer()`): a tela não passa o usuário a cada chamada. Com a sessão de uma conta real, o administrador e o profissional veem os dados simulados, que alcançam a organização inteira; o cuidador e o familiar não veem nada, porque os vínculos simulados são dos usuários de demonstração, e as telas que procuram a organização da sessão nos dados simulados não a encontram. Medicamentos e alertas escolhem o paciente pela API, mas os dados de cada paciente vêm dos serviços simulados, com os ids dos dados simulados: um paciente real abre essas telas com o erro de carregamento, porque os serviços simulados não acham o id dele. Formulários e registros já leem a API, e três pontos deles ainda dependem de serviços simulados: as regras de alerta da página de um formulário real aparecem vazias, e criar regra falha; a seção dos alertas gerados no detalhe de um registro real mostra o erro de carregamento; e o painel e os relatórios não veem os registros reais. Nos testes, as sessões são as dos usuários de demonstração, os pacientes, os formulários e os registros vêm de `tests/support/fixtures/`, com os mesmos ids, e essas telas funcionam.

As telas não chamam os serviços direto. Para ler, usam o hook `useResource`, que devolve um de quatro estados (`loading`, `success`, `empty` ou `error`) e uma função `retry` para tentar de novo depois de uma falha. Para enviar um formulário, usam o `useSubmit`, que devolve `idle`, `submitting`, `success` ou `error`, com os dados, o `meta` e o erro da resposta. A sessão é a exceção: login, primeiro acesso e Sair passam pelo `SessionProvider`, que guarda o resultado.

Os dados simulados ficam em `src/data/mocks/`, com os campos da API, e usam nomes, documentos e contatos inventados. Todo CPF passa nos dígitos verificadores, e todo paciente aponta para um profissional de saúde existente. Nenhum dado pessoal real entra no repositório.

Os dados de acompanhamento seguem as mesmas regras da API, conferidas por teste:

- **Vínculos de cuidado** (`patientLinks.js`): só cuidador e familiar, no papel igual ao perfil, com no máximo um vínculo vigente por pessoa e paciente. O vínculo de profissional responsável vem do campo `responsible` do paciente.
- **Formulários** (`forms.js`): no formato de `GET /forms/{formId}`, com as versões publicadas guardadas em `versions` (a vigente é a última) e o rascunho vivo da próxima versão em `draft`. Os dados simulados cobrem as situações da API: formulários com versão 1 publicada, um nunca publicado, um com rascunho pendente, um com duas versões e um desativado. Publicar cria a versão seguinte, e os registros antigos continuam ligados à versão que responderam.
- **Registros de acompanhamento** (`followUps.js`): feitos só por cuidador com vínculo vigente, respondendo a versão vigente de um formulário que vale para o paciente. As datas são relativas ao dia de hoje no fuso de Brasília, porque a evolução da API olha por padrão os últimos 30 dias; com datas fixas, os gráficos ficariam vazios poucas semanas depois. Valores, autores e horários são fixos.
- **Anexos** (`attachments.js`): enviados pelo autor do registro, depois dele, nos tipos e no tamanho que a API aceita.
- **Regras de alerta** (`alertRules.js`): no formato de `GET /alert-rules`, sobre campos de número ou de escala da versão vigente de formulários ativos, gerais ou de um paciente do público do formulário, com uma inativa. Os valores de referência são inventados para a demonstração: a API não traz limiar clínico padrão, e quem define cada um é o profissional.
- **Alertas** (`alerts.js`), nas três origens da API. Os de valor registrado não são escritos à mão: saem das regras simuladas aplicadas aos registros simulados, com a regra do paciente substituindo as gerais do mesmo campo, como na API; o alerta nasce logo depois do envio do registro, e o registro anulado depois disso continua como origem dele. Os lembretes saem da agenda dos medicamentos simulados com lembrete ligado, nas últimas 24 horas. A ausência é a do paciente que passou do prazo do formulário semanal. As mensagens seguem o texto da API (`src/utils/alertMessages.js`). As varreduras por relógio da API, que geram ausências e lembretes, não rodam na sessão simulada: um medicamento cadastrado ou editado na sessão não gera lembrete.
- **Auditoria** (`auditActions.js` e `auditEvents.js`): o catálogo de ações copiado do backend, na ordem do seletor da Figura 45, e eventos com as datas relativas ao momento da consulta, porque a lista da API olha por padrão os últimos 30 dias. Há eventos de sistema e de outra organização, que o administrador da plataforma vê com os nomes de pessoas mascarados, como na API.
- **Organizações clientes** (`organizations.js`): a de demonstração e duas outras, cada uma com o termo de vigência do seu plano. A Clínica Bem Viver fica no Basic, com vencimento poucos dias depois da consulta, para o aviso de vencimento aparecer, e com uma solicitação pendente do Enterprise, para a fila da plataforma não nascer vazia. Usuários e pacientes simulados são só da organização de demonstração, contada pelos estados; as outras têm uso em números fixos, e a cadastrada na sessão nasce com o primeiro administrador e nenhum paciente.
- **Medicamentos** (`medications.js`): só de pacientes ativos, com unidade e via aceitas pela API, um inativo, intervalos e fins variados e um sem lembrete. As datas são fixas: um tratamento encerrado continua encerrado. O próximo horário e o horário coincidente com outro medicamento ativo do paciente dependem do momento da consulta e são calculados nela, pela regra de agenda do backend (`src/utils/medicationSchedule.js`).

O estado que a API guardaria no banco fica nos serviços, e `resetMockState` volta tudo ao início:

- `src/services/patientStore.js`: os pacientes e os vínculos dos dados simulados, lidos pelos serviços ainda simulados (as telas de pacientes já leem a API), com o alcance de cada perfil;
- `src/services/formStore.js`: os formulários dos dados simulados, lidos pelas regras de alerta ainda simuladas (as telas de formulários já leem a API);
- `src/services/followUpStore.js`: os registros dos dados simulados e as anulações, lidos pelos alertas, pelo painel e pelos relatórios ainda simulados (as telas de registros já leem a API);
- `src/services/alertStore.js`: regras criadas e alteradas e resoluções. Os alertas de valor registrado saem das regras simuladas aplicadas aos registros simulados, e o alerta mostra o nome atual da regra e a situação atual do registro de origem; os de um registro novo são gerados pela API e aparecem quando os alertas forem ligados a ela;
- `src/services/medicationStore.js`: medicamentos cadastrados, editados, inativados e reativados; monta cada um com o próximo horário e o horário coincidente, que a visão geral do paciente também lê;
- `src/services/userStore.js`: usuários cadastrados por convite, editados, com perfil ou situação trocados e com convite ou senha provisória emitidos; é a fonte dos usuários para o login, os vínculos de cuidado e o profissional responsável;
- `src/services/organizationStore.js`: organizações cadastradas e editadas na sessão, com a situação; termo de vigência de cada organização, que a atribuição e a aprovação trocam inteiro, como a API; e solicitações de mudança de plano, com as decisões;
- `src/services/auditStore.js`: as exportações em PDF feitas na sessão, que a API audita. A lista de relatórios recentes, a contagem de cada tipo e a auditoria são montadas por elas, como na API; as outras ações da sessão não geram evento.

As regras de conteúdo que a API confere (campos de formulário por tipo, respostas de registro, anexos, medicamentos e regras de alerta) ficam em `src/utils/`, nas mesmas funções que as telas usam para apontar o problema antes do envio.

Duas alternativas foram descartadas:

- **Importar os dados simulados direto nas páginas.** A integração exigiria alterar todas as telas.
- **Interceptar requisições HTTP com Mock Service Worker.** Colocaria no navegador um service worker só para os dados simulados, e o PWA não usa service worker.

## Sessão, perfis e permissões

| Perfil | Código | Acesso |
| --- | --- | --- |
| Administrador | `admin` | Tudo o que o profissional de saúde faz, mais usuários, organização, plano, painel operacional, relatórios gerenciais e auditoria. |
| Profissional de saúde | `professional` | Pacientes, histórico e evolução, formulários, consulta e resolução de alertas, regras de alerta, anulação de registros, medicamentos, relatórios e vínculos de cuidado. |
| Cuidador | `caregiver` | Pacientes vinculados, registro de acompanhamento, consulta e resolução de alertas e consulta de medicamentos. |
| Familiar | `family` | Consulta do paciente vinculado: cadastro, histórico, evolução, alertas e medicamentos. |
| Administrador da plataforma | `platform_admin` | Organizações clientes e seus planos, e a auditoria de todas as organizações. |

As permissões da sessão são as efetivas que a API devolve no login e em `GET /profile`. A matriz local (`src/constants/permissions.js`) replica `src/modules/Access/access.permissions.ts` do vitacare-backend, a fonte oficial, e serve aos códigos que as telas consultam, aos serviços ainda simulados e às sessões dos testes; mudança na matriz do backend continua sendo repetida aqui.

As telas consultam permissões, por exemplo `can('patients:create')`, e nunca o nome do perfil. Assim, uma mudança na matriz não exige alterar telas. Conteúdo que depende de uma permissão fica dentro de `RequirePermission`: sem a permissão, o conteúdo não é renderizado e não carrega dados.

Apenas o cuidador registra acompanhamento. O administrador herda as permissões do profissional de saúde, não as do cuidador.

Todos os perfis, inclusive o administrador da plataforma, têm `profile:manage`, que só alcança o cadastro de quem está na sessão.

A sessão fica no `SessionProvider` e chega às telas pelo hook `useSession`, em um de cinco estados:

| Estado | Quando | Duração |
| --- | --- | --- |
| `anonymous` | Ninguém entrou, ou saiu pelo Sair. | — |
| `restricted` | O login respondeu `password_change_required`: usuário convidado, ou com senha provisória a trocar. Só alcança o primeiro acesso e o Sair, e não tem permissões. | 10 minutos, como a sessão restrita da API. |
| `terms` | O login respondeu `terms_acceptance_required`, ou uma chamada respondeu `403 TERMS_ACCEPTANCE_REQUIRED`. Só alcança o termo de uso e o Sair, e não tem permissões até o aceite. | A da sessão normal. |
| `authenticated` | Sessão normal. | 12 horas absolutas e 30 minutos sem atividade, como na API; a inatividade chega como `401`. |
| `expired` | O prazo da sessão chegou, ou a API respondeu `401` a uma chamada com o token. Usuário e permissões somem, e o login mostra o aviso de sessão expirada. | Até a próxima entrada. |

O serviço de autenticação (`src/services/authService.js`) usa as rotas `auth` e `profile` da API: login com código da organização, e-mail e senha, primeiro acesso, pedido de recuperação, redefinição pelo link, troca da própria senha, Sair e, depois do aceite do termo, a sessão recarregada por `GET /profile`. A sessão do login (`data.session`) chega às telas com o perfil dentro do usuário e o nome fantasia em `tradeName`, o formato que elas já liam. O token e a sessão ficam no `sessionStorage`: recarregar a página, inclusive a recarga automática depois de um deploy, mantém a sessão, e outra aba ou outro navegador não a herdam. O `localStorage` não é usado, porque é compartilhado entre as abas e continua depois que o navegador fecha. O Sair encerra a sessão na tela antes da resposta da API, para que um logout que falhe não prenda ninguém. Bloqueio por tentativas, prazos e mensagens são os da API.

O termo de uso (`/termo-de-uso`) mostra o texto vigente, que a API manda em Markdown com só cinco construções (títulos de dois níveis, parágrafos, listas e negrito); `src/utils/termsMarkdown.js` as lê e a tela as monta em React, sem HTML injetado. O aceite envia a versão exibida: se outra versão saiu durante a leitura, a API recusa, e o texto novo é lido de novo.

## Rotas e navegação

Os endereços, a permissão de cada tela e os itens do menu ficam em `src/constants/routes.js`; a árvore de rotas, em `src/routes.jsx`.

- **Rotas públicas:** login (`/login`), pedido de recuperação de senha (`/recuperar-senha`), redefinição pelo link enviado por e-mail (`/redefinir-senha?token=`) e aceite do convite pelo link enviado por e-mail (`/aceitar-convite?token=`). Os dois endereços dos e-mails são os que a API usa para montar os links (`PASSWORD_RESET_URL` e `INVITATION_ACCEPT_URL`); o token sai só do endereço e não é guardado no navegador. Quem já tem sessão e abre o login vai para a página inicial.
- **Termo de uso:** `/termo-de-uso` só abre com a sessão no estado `terms`; o aceite libera a mesma sessão e leva à página inicial. O rodapé de todas as telas, inclusive o login, leva à página pública do termo na origem da API (`/termos`), em outra aba.
- **Primeiro acesso:** `/primeiro-acesso` só abre com a sessão restrita; sem ela, leva ao login. Depois da troca, a API encerra a sessão restrita, e o login abre com o código da organização e o e-mail preenchidos.
- **Rotas autenticadas:** ficam dentro de `RequireSession`, que leva ao primeiro acesso quem está com a sessão restrita, ao termo de uso quem ainda não aceitou a versão vigente e ao login quem não tem sessão ou está com a sessão expirada; no segundo caso, o login mostra o aviso de sessão expirada (UC01, fluxo alternativo). Cada rota exige a permissão de leitura da sua tela, por `RequirePermission`: sem ela, aparece a página de acesso negado, e a tela não é montada.
- **Página inicial:** escolhida por permissão, nesta ordem: painel (`dashboard:read`), organizações (`platform_organizations:read`) e pacientes (`patients:read`).
- **Telas abaixo de um item do menu:** `/pacientes/novo` (cadastro, `patients:create`), `/pacientes/:patientId` (detalhe, `patients:read`), `/pacientes/:patientId/editar` (edição, `patients:update`), `/pacientes/:patientId/historico` (histórico e evolução, `patient_history:read`), `/pacientes/:patientId/registrar` (registro de visita, `follow_ups:create`), `/registros/:followUpId` (detalhe do registro, `patient_history:read`), `/alertas/:alertId` (detalhe do alerta, `alerts:read`), `/formularios/novo` (formulário novo, `forms:create`), `/formularios/:formId` (página do formulário, `forms:read`), `/painel/:indicator` (detalhe de um indicador do painel, `dashboard:read`), `/usuarios/:userId` (página do usuário, `users:read`), `/auditoria/:eventId` (detalhe do evento, `audit_events:read`), `/organizacoes/nova` (cadastro de organização, `platform_organizations:create`) e `/organizacoes/:organizationId` (página da organização, `platform_organizations:read`). Cada uma exige a permissão que a API pede para a ação dela; o item do menu continua marcado nelas.
- **Listas por paciente (Registros, Medicamentos e Alertas):** a API só lista registros, medicamentos e alertas de um paciente, então essas telas pedem o paciente primeiro, pelo componente `PatientPicker`, e o guardam na query do endereço (`/medicamentos?paciente=…`); quem alcança um paciente só entra direto na lista dele. A escolha oferece os pacientes ativos da primeira página da listagem da API, e o texto digitado vai à API como busca, para achar quem não coube nela; a resposta soma-se à primeira página, em vez de substituí-la, porque a busca da API não ignora acento e o filtro da escolha ignora; o paciente inativo que vem no endereço, pelo detalhe dele, é buscado pelo id. O público do formulário usa a mesma busca (`usePatientSearch`), e quem está nele e fora da lista de ativos (inativo, ou além da primeira página) é consultado pelo id, para aparecer pelo nome e não sair do público ao salvar. A lista de registros usa a lista e os filtros do histórico do paciente, e cada registro leva ao detalhe dele. A de alertas guarda a aba na query (`&aba=critico`), e cada alerta leva ao detalhe dele.
- **Regras de alerta:** ficam na página do formulário publicado, sem endereço próprio, e só aparecem para quem tem `alert_rules:manage`, a única permissão que lê as regras na API.
- **Listagem de pacientes:** busca, condição, situação e página ficam na query do endereço (`?busca=…&condicao=…&situacao=inactive&pagina=2`), para que o "voltar" do navegador e a busca da barra superior abram a lista no mesmo estado. A busca só com dígitos e pontuação, que é um CPF, vai pelo estado da rota e não pelo endereço, para o documento não ficar no histórico do navegador; a barra superior e o aviso de CPF repetido do cadastro fazem o mesmo (`patientSearch`, em `src/constants/routes.js`). O familiar com um único paciente vinculado vai direto ao acompanhamento dele; a decisão vem do `viewerLink.role` devolvido pela API, e não do nome do perfil.
- **Painel, relatórios, usuários, auditoria e organizações:** filtros e página ficam na query do endereço, como na listagem de pacientes: o período do painel (`?periodo=7`); o tipo, o paciente, o período e a condição dos relatórios (`?tipo=alertas&de=…&ate=…&condicao=…`); busca, perfil, situação e página dos usuários; busca, período, ação, gravidade, origem, organização e página da auditoria (`?gravidade=warning&pagina=2`); e busca, situação e página das organizações. O detalhe do paciente leva ao relatório dele (`/relatorios?paciente=…`).
- **Menu:** um item por tela, agrupado em Cuidado, Gestão e Plataforma. Só aparece o item cuja permissão a sessão tem, para que o menu não leve a uma página de acesso negado. A mesma lista alimenta o menu lateral, o menu recolhível e a barra inferior.
- **Celular:** abaixo de 900 px, o menu lateral vira um menu recolhível, aberto pela barra superior. Quem tem `follow_ups:create` (hoje, apenas o cuidador) navega por uma barra inferior, porque registra visitas com o aparelho na mão.
- **Menu do usuário:** fica na barra superior, presente em todos os layouts e perfis, com "Alterar senha" e o Sair. A troca de senha encerra todas as sessões da conta, como na API, e volta ao login com o aviso e com a organização e o e-mail preenchidos.
- **Páginas de estado:** não encontrada, acesso negado, erro inesperado e tela em construção usam o mesmo molde, em `src/pages/Status/`. A tela em construção ocupa o endereço de cada tela que ainda não existe.
- **Carregamento sob demanda:** cada tela é um arquivo à parte do build, declarado em `src/lazyPages.js` e baixado na primeira vez que a tela é aberta; assim, nenhum arquivo passa de 500 kB, e a primeira carga não traz o código de todas as telas. A página de estado é a exceção e fica no pacote principal, porque é a tela de erro quando o arquivo de outra tela não carrega; o teste do roteador falha se outra tela for importada direto. O roteador troca de tela em transição, mantendo a anterior até a nova chegar, então a barra de carregamento só aparece quando a área é montada: na primeira carga e ao entrar ou sair do layout autenticado, onde ela fica abaixo do menu.
- **Depois de um deploy:** os arquivos de tela do build anterior somem, e o nginx responde 404 para eles. A página aberta antes do deploy recarrega uma vez, pelo evento `vite:preloadError`, e passa a usar os arquivos novos. A hora da recarga fica no `sessionStorage`: uma segunda falha em menos de um minuto vai para a página de erro, em vez de recarregar sem parar.

## Identidade visual

A estrutura de telas segue os protótipos do TCC (Figuras 31 a 46). Os valores ficam no tema, em `src/styles/`; esta seção registra os critérios.

- **Uma cor de ação:** o teal da marca. Botões e links usam `#0D7D77`, com contraste de 4,98:1 sobre branco. O `#00B69B` dos protótipos tem 2,57:1, abaixo do mínimo de 4,5:1 da WCAG 2.1 (nível AA) para texto, e fica restrito a elementos decorativos, como o preenchimento de gráficos e o fundo de selos. Sobre o fundo teal-claro (`#E7F4F3`), usado no item ativo do menu, o texto passa para `#0B6B66` (5,63:1), porque o teal de ação ali fica em 4,42:1.
- **Texto:** azul-marinho do logotipo, `#183058`, com contraste de 13,1:1 sobre branco.
- **Cores de estado:** crítico, atenção, informativo e normal aparecem apenas para indicar situação clínica ou do sistema, nunca como decoração.
- **Superfícies:** fundo cinza-claro, cartões brancos com sombra difusa em tom azul-marinho e cantos arredondados.
- **Movimento:** transições curtas com desaceleração, entrada escalonada de listas e esqueletos de carregamento no formato do conteúdo. Animações usam apenas `transform` e `opacity` e respeitam a preferência do sistema por movimento reduzido.

Os contrastes seguem a fórmula de luminância relativa da WCAG 2.1. O teste `tests/styles/theme.test.js` confere o mínimo de 4,5:1 entre cada cor de texto do tema e os fundos em que ela aparece; uma cor nova no tema entra também nesse teste.

## Acessibilidade

- **Foco pelo teclado:** botões, itens de menu e links mostram um contorno de 2 px no teal de ação, afastado 2 px, só quando o foco chega pelo teclado (`Mui-focusVisible`); o clique com mouse não o mostra. O contorno tem 4,98:1 sobre branco e 4,56:1 sobre o fundo cinza-claro, acima dos 3:1 que a WCAG 2.1 pede para indicadores de foco; o teste do tema confere esse mínimo.
- **Botão de alternância e texto de ajuda de campo desabilitado:** usam a cor de texto secundário do tema, porque os cinzas padrão do Material UI ficam abaixo de 4,5:1; o texto de ajuda de um campo travado é o que explica por que ele não muda.
- **Sem esmaecer por opacidade:** o registro anulado se distingue pelo selo e pelas respostas riscadas. A opacidade clareava também o link e o selo, abaixo do contraste mínimo.
- **Tabelas largas:** no celular, a tabela que não cabe rola de lado dentro de `ScrollableRegion`, uma região com nome que recebe foco, para que quem usa só o teclado alcance as colunas escondidas.
- **Conferência:** varredura com o axe-core (WCAG 2.0 e 2.1, níveis A e AA), fluxos feitos só com teclado e telas de 360 a 1440 px sem rolagem horizontal, no Chromium; no Edge e no Firefox, por um roteiro manual. O Safari depende de um aparelho Apple, e o leitor de tela real não foi testado; os rótulos são conferidos pelo axe.

## Instalação

O manifesto (`public/manifest.webmanifest`) dá o nome, as cores do tema e os ícones de 192 e 512 px, com a versão recortável do Android; o `index.html` liga o manifesto, o ícone da tela de início do iPhone e a cor da barra do navegador. O teste `tests/manifest.test.js` confere os campos, o tamanho de cada ícone e as cores iguais às do tema.

Não há service worker: o TCC não prevê funcionamento offline, e um pré-cache arriscaria mostrar a versão antiga depois de um deploy. Pela documentação do Chrome (atualizada em 05/12/2023), instalar pelo menu do navegador não exige service worker desde o Chrome 112 no computador e o 108 no Android; o aviso automático de instalação ainda exigia um.

O navegador só oferece instalar em contexto seguro (HTTPS ou `localhost`): em produção, pelo domínio com HTTPS, e no desenvolvimento, com `npm run preview`, em `localhost`.

## Diferenças em relação aos protótipos

| Tela | Protótipo | Implementação | Motivo |
| --- | --- | --- | --- |
| Login (Figura 31) | E-mail e senha | Código da organização, e-mail e senha | A API autentica o usuário dentro de uma organização. |
| Login (Figura 31) | Link "Inscreva-se" | Removido | Organizações são cadastradas pelo administrador da plataforma; não existe cadastro público. |
| Login e recuperação (Figuras 31 e 32) | Foto de uma profissional de saúde na coluna esquerda | Painel azul-marinho com a frase da marca e três destaques | A foto do protótipo não tem licença de uso conhecida. |
| Recuperação de senha (Figura 32) | Três etapas: e-mail, código de seis dígitos e nova senha | Pedido com código da organização e e-mail, que mostra a orientação da API, e nova senha definida pelo link do e-mail | A API envia um link com token e não tem rota para código; com o envio de e-mail desligado, orienta a pedir uma senha temporária ao administrador. |
| Registro de visita (Figuras 38 e 40) | Sem indicação de perfil | Apenas cuidador | Matriz de permissões da API. |
| Medicamentos (Figura 41) | Percentual de adesão | Não exibido | A API não registra a tomada do medicamento. |
| Medicamentos (Figura 41) | Condição do medicamento (HAS, DM2) | Não exibida | A API não liga o medicamento a uma condição; as condições ficam no paciente. |
| Medicamentos (Figura 41) | Situação "Suspenso" e "suspensa em" | "Inativo" e "Inativo desde" | A API guarda a suspensão como inativação, que pode ser revertida. |
| Medicamentos (Figura 41) | "+ Prescrever Med." | "Novo medicamento" | Não há prescrição eletrônica; é o cadastro do UC08. |
| Medicamentos (Figura 41) | "1× ao dia – manhã" | Quantidade e horários ("2× ao dia · 08:00 e 20:00"), intervalo em dias e próximo horário | A API guarda horários fixos, e não períodos do dia. |
| Medicamentos (Figura 41) | Dose em teal | Dose no azul-marinho do texto | O teal é a única cor de ação. |
| Alertas (Figura 42) | Alertas de todos os pacientes numa lista | Lista de um paciente, escolhido primeiro | A tela é anterior à lista da organização, que a API passou a ter no BE-33 (`GET /alerts` sem `patientId`). |
| Alertas (Figura 42) | "Marcar todos como lidos" e contador no título | Não exibidos | A leitura é da caixa de notificações de cada usuário, e não do alerta (FE-35); o contador do título (`GET /alerts/summary`) é do BE-33, posterior à tela. |
| Alertas (Figura 42) | Aba "Todos" | Aba "Abertos" | A aba não inclui os resolvidos, que têm aba própria. |
| Alertas (Figura 42) | "Intervenção imediata", "Monitorar de perto" e "Para conhecimento" nos contadores | Só o nome da severidade | Na API, a severidade é só um rótulo, sem interpretação clínica. |
| Alertas (Figura 42) | Cuidador em cada alerta | Não exibido | Só o alerta de valor registrado tem autor (`followUp.author`); a ausência de registro e o lembrete de medicamento não têm. |
| Alertas (Figura 42) | "Há 14 min" | Data e hora | Como nas outras telas, sem um relógio que atualize a lista. |
| Alertas (Figura 42) | "Medicamento não administrado" e "Visita agendada não confirmada" | Lembrete de medicamento e ausência de registro | A API não registra tomada de medicamento nem agenda de visitas; as origens são valor registrado, ausência e lembrete. |
| Registro de visita (Figura 38) | Avisos durante a digitação ("Acima do limite", "Alerta será gerado") | Não exibidos; depois de salvar, o registro mostra os alertas que gerou | O cuidador não lê as regras de alerta, e a resposta do registro não traz os alertas. |
| Registro de visita (Figura 38) | Uma caixa de seleção por atividade | Campo sim ou não com dois botões; caixas só na múltipla escolha, em que nenhuma marcada é "não informado" | Caixa desmarcada valeria "não" e preencheria o registro sozinha. |
| Registro de visita no celular (Figura 40) | "Valor anterior" abaixo do campo | Não exibido | Fora desta etapa; o último valor de cada medição está no detalhe do paciente. |
| Configuração de formulários (Figura 39) | Painel duplo, com a lista à esquerda e os campos à direita | Lista de formulários e uma página para cada formulário | O painel duplo não cabe em 375 px e não dá endereço a cada formulário. |
| Configuração de formulários (Figura 39) | "Publicar alterações" e "Salvar rascunho" valendo para tudo | Dados salvos à parte; campos salvos em rascunho e publicados como versão nova, com confirmação quando já há versão vigente | A API muda os dados sem criar versão e muda os campos só por rascunho e publicação. |
| Painel (Figura 33) | "Registros Hoje" e gráfico por mês, de janeiro a dezembro | "Registros no período", com atalhos de hoje, 7, 30 e 90 dias, e gráfico por dia do período | A API calcula o painel sobre um período e devolve os registros por dia; "hoje" é o período de um dia. |
| Relatórios (Figura 43) | "Eficiência dos Cuidadores", com desempenho e cobertura | "Atividade dos cuidadores", só com contagens, sem nota nem classificação | Nome e conteúdo do relatório na API (BE-30). |
| Relatórios (Figura 43) | Filtros de período, tipo e condição e botão "Gerar Relatório" para todos os tipos | Um cartão por tipo, que abre o relatório com os filtros dele: paciente e período no individual, período e condição nos gerenciais | O relatório individual exige o paciente, e a condição só existe nos gerenciais. |
| Relatórios (Figura 43) | Formatos PDF e XLSX e ações de editar e cancelar nos recentes | Só PDF; nos recentes, "Gerar de novo" | A API exporta só PDF e não guarda o arquivo: os recentes vêm das exportações auditadas, e gerar de novo repete o pedido. |
| Relatórios (Figura 43) | Os três tipos para todos | Relatórios gerenciais só para o administrador, no plano Enterprise | Matriz de permissões e recurso do plano na API. |
| Usuários (Figura 44) | Contadores de total, administradores, cuidadores e familiares, com "Ativos hoje" | Ativos de cada um dos quatro perfis da organização e vagas do plano em uso | Os contadores saem do total da listagem da API, filtrada por perfil e situação. |
| Usuários (Figura 44) | Botões de editar e inativar em cada linha | Ações na página do usuário | São seis ações, que dependem da situação do usuário, e a edição precisa do CPF inteiro, que a lista da API mascara. |
| Auditoria (Figura 45) | Filtro "Usuário" | Busca pelo nome de quem fez ou pela ação | A busca da API já procura o nome; a escolha por usuário pediria a lista de usuários, que o administrador da plataforma não lê. |
| Auditoria (Figura 45) | Perfil "Automação" nos eventos de sistema | "Sistema", sem perfil e sem IP | O evento de sistema da API não tem usuário, perfil nem IP. |
| Auditoria (Figura 45) | Entidade com código ("Paciente #1047") | Nome e tipo do item; registro, alerta e anexo só com o tipo | A API manda o nome só de usuário, organização, paciente, formulário e medicamento. |
| Auditoria (Figura 45) | Leituras, como "Acessou painel do paciente" | Não exibidas | A API não audita leitura. |
| Configurações (Figura 46) | Plano "Pro – Clínica" | Planos Basic e Enterprise | Catálogo do Quadro 2 do TCC, adotado pela API. |
| Configurações (Figura 46) | Menu lateral com Organização, Notificações, Segurança, Plano & Uso e Integrações | Seções empilhadas: organização e plano e uso, com a mudança de plano | O menu lateral não cabe em 375 px; as outras partes estão nas linhas abaixo. |
| Configurações (Figura 46) | Notificações da organização (relatório diário, lembrete de medicação pendente, aviso de acesso do familiar) e autenticação em dois fatores | Não exibidos | A API adiou esses recursos; as preferências de notificação que ela tem são de cada usuário, e não da organização. |
| Configurações (Figura 46) | Seletor "Sessão máxima sem atividade" | Não exibido | A API fixa o tempo da sessão, igual para todos. |
| Configurações (Figura 46) | Uso de armazenamento e de registros por mês | Uso de usuários (ativos e convidados) e de pacientes ativos | A API limita e conta só usuários e pacientes. |
| Configurações (Figura 46) | "Ver planos" | "Solicitar mudança de plano", com o catálogo no pedido | O plano muda por solicitação, que o administrador da plataforma aprova (UC04). |
| Pacientes (Figura 34) | Situação clínica (Crítico, Observação) e "Última consulta" | Situação cadastral (Ativo, Inativo); sem última consulta | A API não classifica o paciente nem traz a última visita na listagem. |
| Pacientes (Figura 34) | Coluna "Cuidador" | Coluna "Responsável" | A listagem da API traz o profissional responsável; cuidadores aparecem na equipe de cuidado do detalhe. |
| Cadastro (Figura 35) | Campo "Cuidador Responsável" | Profissional responsável, escolhido entre profissionais e administradores | A API exige um profissional ou administrador como responsável; cuidadores entram como vínculo de cuidado. |
| Detalhe (Figura 36) | Código "PAC-0042", classificação Normal/Atenção e barra de tendência | Últimas medições sem classificação; tendência nos gráficos do histórico | A API não tem código de paciente nem classificação clínica; a tendência é a inclinação calculada na evolução. |
| Acompanhamento (Figura 37) | Situação "Estável", "Próxima visita" e adesão aos medicamentos | Não exibidos | Sem classificação clínica, agenda de visitas ou registro de tomada na API. |
| Todas | Botões teal `#00B69B` com texto branco | Teal `#0D7D77` | Contraste mínimo para texto (WCAG 2.1 AA). |
| Todas | Menu com todos os itens, inclusive no modo de leitura do familiar | Itens permitidos ao perfil, agrupados em Cuidado, Gestão e Plataforma | Matriz de permissões da API (RF016): um item sem permissão levaria a acesso negado. |
| Todas | Item "Dashboard" | Item "Painel" | Nome do requisito (RF015, painel operacional) e interface em português. |
| Todas | Botão "Logout" no rodapé do menu lateral | "Sair" no menu do usuário, na barra superior | A barra superior existe em todos os layouts; a barra inferior do cuidador no celular não tem menu lateral. |

Telas sem protótipo, necessárias para os fluxos da API: primeiro acesso (troca da senha provisória), termo de uso e privacidade, aceite do convite pelo link, redefinição da senha pelo link, equipe de cuidado do paciente, lista de registros por paciente, detalhe do registro com anexos e anulação, detalhe do alerta, regras de alerta, detalhe de cada indicador do painel, página do usuário, detalhe do evento de auditoria e, para o administrador da plataforma, organizações e planos.

## Testes

Os testes usam Vitest e Testing Library e ficam em `tests/`, espelhando as pastas de `src/`. A lógica, como permissões, máscaras, filtros, paginação e montagem de formulários dinâmicos, é escrita com o teste antes do código. As telas são testadas pelo comportamento visível: o que aparece em cada estado (carregando, vazio, erro, com dados) e o que cada perfil pode ou não fazer. Nenhum teste chama a API real: o `fetch` responde por um stub, e cada teste diz qual seria a resposta da API e confere o que a tela pediu ([como contribuir](../CONTRIBUTING.md#testes)).

## Em aberto

Situação conforme o `develop` do vitacare-backend em 18/11/2026 (commit `3beebe3`).

- **Nome dos perfis:** a API devolve o nome do perfil sem acentuação ("Profissional de saude"). A interface mostra o nome pelo código do perfil, em `src/data/profiles.js`.

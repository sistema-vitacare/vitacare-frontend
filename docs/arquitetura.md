# Arquitetura do frontend

Este documento descreve como o frontend do VitaCare é construído: tecnologias, camadas, dados simulados, controle de acesso por perfil e identidade visual.

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

O ambiente usa Node.js 24, com versão mínima 24.15, exigida pelo jsdom dos testes.

## Camadas

As dependências seguem um único sentido: páginas, hooks, serviços, dados.

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Páginas | `src/pages/` | Uma pasta por tela. Montam o layout e tratam os estados de carregamento, vazio e erro. |
| Componentes | `src/components/` | Peças usadas em duas ou mais telas. Um trecho vira componente a partir da segunda repetição. |
| Hooks | `src/hooks/` | Chamam os serviços e entregam dados e estado às páginas. |
| Serviços | `src/services/` | Único ponto de acesso a dados. |
| Dados | `src/data/` | Textos da interface e dados simulados. Nenhum texto, lista ou valor fica fixo dentro de componente. |
| Constantes | `src/constants/` | Rotas, permissões e listas fechadas, como severidades, unidades de dose e tipos de campo. |
| Estilos | `src/styles/` | Tema do Material UI: cores, tipografia, espaçamentos, raios, sombras e movimento. |
| Utilitários | `src/utils/` | Funções puras: máscaras, formatação de datas, cálculo de idade. |

## Dados simulados

Os serviços respondem no mesmo formato da API do backend. O utilitário `src/services/mockApi.js` monta essas respostas:

- sucesso: `{ data, meta }`, com `meta.requestId` e `meta.timestamp`;
- listagem: `meta.pagination` com `page`, `limit`, `total` e `totalPages`, página 1 e limite 20 quando não informados, como na API;
- erro: um `ApiError` com `status`, `code`, `message`, `detail` e `fields`. É o mesmo objeto que o cliente HTTP vai produzir a partir do corpo `{ error, meta }` da API, então as telas tratam erro do mesmo jeito antes e depois da integração.

Cada requisição simulada espera um atraso curto, zerado nos testes. A função `failNextRequest` faz a próxima requisição falhar, para exercitar os estados de erro das telas.

Os serviços simulados sabem quem consulta pela sessão que o `authService` guarda no login, do mesmo jeito que o cliente HTTP vai guardar o token: a tela não passa o usuário a cada chamada, e a integração não muda a assinatura dos serviços.

As telas não chamam os serviços direto. Para ler, usam o hook `useResource`, que devolve um de quatro estados (`loading`, `success`, `empty` ou `error`) e uma função `retry` para tentar de novo depois de uma falha. Para enviar um formulário, usam o `useSubmit`, que devolve `idle`, `submitting`, `success` ou `error`, com os dados, o `meta` e o erro da resposta. A sessão é a exceção: login, primeiro acesso e Sair passam pelo `SessionProvider`, que guarda o resultado.

Os dados simulados ficam em `src/data/mocks/`, com os campos da API, e usam nomes, documentos e contatos inventados. Todo CPF passa nos dígitos verificadores, e todo paciente aponta para um profissional de saúde existente. Nenhum dado pessoal real entra no repositório.

Os dados de acompanhamento seguem as mesmas regras da API, conferidas por teste:

- **Vínculos de cuidado** (`patientLinks.js`): só cuidador e familiar, no papel igual ao perfil, com no máximo um vínculo vigente por pessoa e paciente. O vínculo de profissional responsável vem do campo `responsible` do paciente.
- **Registros de acompanhamento** (`followUps.js`): feitos só por cuidador com vínculo vigente, respondendo campos dos formulários de `forms.js`. As datas são relativas ao dia de hoje no fuso de Brasília, porque a evolução da API olha por padrão os últimos 30 dias; com datas fixas, os gráficos ficariam vazios poucas semanas depois. Valores, autores e horários são fixos.
- **Alertas** (`alerts.js`): os de leitura não são escritos à mão; saem das regras gerais aplicadas aos registros válidos, como na API.
- **Medicamentos** (`medications.js`): só de pacientes ativos, com unidade e via aceitas pela API.

O estado que a API guardaria no banco (paciente cadastrado, editado ou inativado, vínculo criado ou revogado) fica em `src/services/patientStore.js`, que também aplica o alcance de cada perfil e a máscara do familiar. `resetMockState` volta tudo ao início.

Na integração, o corpo de cada serviço passa a chamar a rota correspondente da API. Páginas e hooks não mudam.

Duas alternativas foram descartadas:

- **Importar os dados simulados direto nas páginas.** A integração exigiria alterar todas as telas.
- **Interceptar requisições HTTP com Mock Service Worker.** Exigiria definir rotas que a API ainda não tem, como painel, relatórios, auditoria e histórico, e colocaria um segundo service worker ao lado do PWA.

## Sessão, perfis e permissões

| Perfil | Código | Acesso |
| --- | --- | --- |
| Administrador | `admin` | Tudo o que o profissional de saúde faz, mais usuários, organização, plano, painel operacional e auditoria. |
| Profissional de saúde | `professional` | Pacientes, histórico e evolução, formulários, consulta e resolução de alertas, regras de alerta, anulação de registros, medicamentos, relatórios e vínculos de cuidado. |
| Cuidador | `caregiver` | Pacientes vinculados, registro de acompanhamento, consulta e resolução de alertas e consulta de medicamentos. |
| Familiar | `family` | Consulta do paciente vinculado: cadastro, histórico, evolução, alertas e medicamentos. |
| Administrador da plataforma | `platform_admin` | Organizações clientes e seus planos, e a auditoria de todas as organizações. |

A matriz de permissões replica `src/modules/Access/access.permissions.ts` do vitacare-backend, que é a fonte oficial. Mudança na matriz do backend precisa ser repetida aqui.

As telas consultam permissões, por exemplo `can('patients:create')`, e nunca o nome do perfil. Assim, uma mudança na matriz não exige alterar telas. Conteúdo que depende de uma permissão fica dentro de `RequirePermission`: sem a permissão, o conteúdo não é renderizado e não carrega dados.

Apenas o cuidador registra acompanhamento. O administrador herda as permissões do profissional de saúde, não as do cuidador.

A sessão fica no `SessionProvider` e chega às telas pelo hook `useSession`, em um de quatro estados:

| Estado | Quando | Duração |
| --- | --- | --- |
| `anonymous` | Ninguém entrou, ou saiu pelo Sair. | — |
| `restricted` | O login respondeu `password_change_required`: usuário convidado, ou com senha provisória a trocar. Só alcança o primeiro acesso e o Sair, e não tem permissões. | 10 minutos, como a sessão restrita da API. |
| `authenticated` | Sessão normal. | 12 horas, como a sessão normal da API. |
| `expired` | Uma das duas sessões venceu. Usuário e permissões somem, e o login mostra o aviso de sessão expirada. | Até a próxima entrada. |

Enquanto os dados são simulados, o serviço de autenticação (`src/services/authService.js`) reproduz as rotas `auth` da API: login com código da organização, e-mail e senha, bloqueio depois de cinco falhas, primeiro acesso, pedido de recuperação e redefinição pelo link. Os usuários de demonstração compartilham uma senha inventada, guardada em `src/data/mocks/credentials.js` e fora do objeto do usuário, porque a API nunca devolve senha. Os atalhos de demonstração do login continuam entrando direto com um usuário de cada perfil. Nos dois caminhos, as permissões vêm da matriz local, porque a API ainda não tem rota que devolva o usuário autenticado com suas permissões (ver "Em aberto").

## Rotas e navegação

Os endereços, a permissão de cada tela e os itens do menu ficam em `src/constants/routes.js`; a árvore de rotas, em `src/routes.jsx`.

- **Rotas públicas:** login (`/login`), pedido de recuperação de senha (`/recuperar-senha`) e redefinição pelo link enviado por e-mail (`/redefinir-senha?token=`). Quem já tem sessão e abre o login vai para a página inicial.
- **Primeiro acesso:** `/primeiro-acesso` só abre com a sessão restrita; sem ela, leva ao login. Depois da troca, a API encerra a sessão restrita, e o login abre com o código da organização e o e-mail preenchidos.
- **Rotas autenticadas:** ficam dentro de `RequireSession`, que leva ao primeiro acesso quem está com a sessão restrita e ao login quem não tem sessão ou está com a sessão expirada; no segundo caso, o login mostra o aviso de sessão expirada (UC01, fluxo alternativo). Cada rota exige a permissão de leitura da sua tela, por `RequirePermission`: sem ela, aparece a página de acesso negado, e a tela não é montada.
- **Página inicial:** escolhida por permissão, nesta ordem: painel (`dashboard:read`), organizações (`platform_organizations:read`) e pacientes (`patients:read`).
- **Telas abaixo de um item do menu:** `/pacientes/novo` (cadastro, `patients:create`), `/pacientes/:patientId` (detalhe, `patients:read`), `/pacientes/:patientId/editar` (edição, `patients:update`) e `/pacientes/:patientId/historico` (histórico e evolução, `patient_history:read`). Cada uma exige a permissão que a API pede para a ação dela; o item do menu continua marcado nelas.
- **Listagem de pacientes:** busca, condição, situação e página ficam na query do endereço (`?busca=…&condicao=…&situacao=inactive&pagina=2`), para que o "voltar" do navegador e a busca da barra superior abram a lista no mesmo estado. O familiar com um único paciente vinculado vai direto ao acompanhamento dele; a decisão vem do `viewerLink.role` devolvido pela API, e não do nome do perfil.
- **Menu:** um item por tela, agrupado em Cuidado, Gestão e Plataforma. Só aparece o item cuja permissão a sessão tem, para que o menu não leve a uma página de acesso negado. A mesma lista alimenta o menu lateral, o menu recolhível e a barra inferior.
- **Celular:** abaixo de 900 px, o menu lateral vira um menu recolhível, aberto pela barra superior. Quem tem `follow_ups:create` (hoje, apenas o cuidador) navega por uma barra inferior, porque registra visitas com o aparelho na mão.
- **Sair:** fica no menu do usuário, na barra superior, presente em todos os layouts.
- **Páginas de estado:** não encontrada, acesso negado, erro inesperado e tela em construção usam o mesmo molde, em `src/pages/Status/`. A tela em construção ocupa o endereço de cada tela que ainda não existe.

## Identidade visual

A estrutura de telas segue os protótipos do TCC (Figuras 31 a 46). Os valores ficam no tema, em `src/styles/`; esta seção registra os critérios.

- **Uma cor de ação:** o teal da marca. Botões e links usam `#0D7D77`, com contraste de 4,98:1 sobre branco. O `#00B69B` dos protótipos tem 2,57:1, abaixo do mínimo de 4,5:1 da WCAG 2.1 (nível AA) para texto, e fica restrito a elementos decorativos, como o preenchimento de gráficos e o fundo de selos. Sobre o fundo teal-claro (`#E7F4F3`), usado no item ativo do menu, o texto passa para `#0B6B66` (5,63:1), porque o teal de ação ali fica em 4,42:1.
- **Texto:** azul-marinho do logotipo, `#183058`, com contraste de 13,1:1 sobre branco.
- **Cores de estado:** crítico, atenção, informativo e normal aparecem apenas para indicar situação clínica ou do sistema, nunca como decoração.
- **Superfícies:** fundo cinza-claro, cartões brancos com sombra difusa em tom azul-marinho e cantos arredondados.
- **Movimento:** transições curtas com desaceleração, entrada escalonada de listas e esqueletos de carregamento no formato do conteúdo. Animações usam apenas `transform` e `opacity` e respeitam a preferência do sistema por movimento reduzido.

Os contrastes seguem a fórmula de luminância relativa da WCAG 2.1. O teste `tests/styles/theme.test.js` confere o mínimo de 4,5:1 entre cada cor de texto do tema e os fundos em que ela aparece; uma cor nova no tema entra também nesse teste.

## Diferenças em relação aos protótipos

| Tela | Protótipo | Implementação | Motivo |
| --- | --- | --- | --- |
| Login (Figura 31) | E-mail e senha | Código da organização, e-mail e senha | A API autentica o usuário dentro de uma organização. |
| Login (Figura 31) | Link "Inscreva-se" | Removido | Organizações são cadastradas pelo administrador da plataforma; não existe cadastro público. |
| Login e recuperação (Figuras 31 e 32) | Foto de uma profissional de saúde na coluna esquerda | Painel azul-marinho com a frase da marca e três destaques | A foto do protótipo não tem licença de uso conhecida. |
| Recuperação de senha (Figura 32) | Três etapas: e-mail, código de seis dígitos e nova senha | Pedido com código da organização e e-mail, que mostra a orientação da API, e nova senha definida pelo link do e-mail | A API envia um link com token e não tem rota para código; sem servidor de e-mail, orienta a pedir uma senha temporária ao administrador. |
| Registro de visita (Figuras 38 e 40) | Sem indicação de perfil | Apenas cuidador | Matriz de permissões da API. |
| Medicamentos (Figura 41) | Percentual de adesão | Não exibido | A API não registra a tomada do medicamento. |
| Configurações (Figura 46) | Plano "Pro – Clínica" | Planos Basic e Enterprise | Catálogo do Quadro 2 do TCC, adotado pela API. |
| Configurações (Figura 46) | Autenticação em dois fatores e preferências de notificação | Não exibidos | Sem requisito funcional nem suporte na API. |
| Pacientes (Figura 34) | Situação clínica (Crítico, Observação) e "Última consulta" | Situação cadastral (Ativo, Inativo); sem última consulta | A API não classifica o paciente nem traz a última visita na listagem. |
| Pacientes (Figura 34) | Coluna "Cuidador" | Coluna "Responsável" | A listagem da API traz o profissional responsável; cuidadores aparecem na equipe de cuidado do detalhe. |
| Cadastro (Figura 35) | Campo "Cuidador Responsável" | Profissional responsável, escolhido entre profissionais e administradores | A API exige um profissional ou administrador como responsável; cuidadores entram como vínculo de cuidado. |
| Detalhe (Figura 36) | Código "PAC-0042", classificação Normal/Atenção e barra de tendência | Últimas medições sem classificação; tendência nos gráficos do histórico | A API não tem código de paciente nem classificação clínica; a tendência é a inclinação calculada na evolução. |
| Acompanhamento (Figura 37) | Situação "Estável", "Próxima visita" e adesão aos medicamentos | Não exibidos | Sem classificação clínica, agenda de visitas ou registro de tomada na API. |
| Todas | Botões teal `#00B69B` com texto branco | Teal `#0D7D77` | Contraste mínimo para texto (WCAG 2.1 AA). |
| Todas | Menu com todos os itens, inclusive no modo de leitura do familiar | Itens permitidos ao perfil, agrupados em Cuidado, Gestão e Plataforma | Matriz de permissões da API (RF016): um item sem permissão levaria a acesso negado. |
| Todas | Item "Dashboard" | Item "Painel" | Nome do requisito (RF015, painel operacional) e interface em português. |
| Todas | Botão "Logout" no rodapé do menu lateral | "Sair" no menu do usuário, na barra superior | A barra superior existe em todos os layouts; a barra inferior do cuidador no celular não tem menu lateral. |

Telas sem protótipo, necessárias para os fluxos da API: primeiro acesso (troca da senha provisória), redefinição da senha pelo link, equipe de cuidado do paciente, regras de alerta e, para o administrador da plataforma, organizações e planos.

## Testes

Os testes usam Vitest e Testing Library e ficam em `tests/`, espelhando as pastas de `src/`. A lógica, como permissões, máscaras, filtros, paginação e montagem de formulários dinâmicos, é escrita com o teste antes do código. As telas são testadas pelo comportamento visível: o que aparece em cada estado (carregando, vazio, erro, com dados) e o que cada perfil pode ou não fazer.

## Em aberto

Situação conforme o `develop` do vitacare-backend em 09/11/2026 (commit `af58a2c`).

- **Usuário autenticado:** o login devolve apenas o estado, o token e os prazos da sessão, e não há rota que devolva o usuário logado com perfil e permissões. Sem ela, o frontend não consegue montar o menu depois da integração.
- **Painel, relatórios e auditoria:** a API ainda não tem rotas para essas telas.
- **Nome dos perfis:** a API devolve o nome do perfil sem acentuação ("Profissional de saude"). A interface mostra o nome pelo código do perfil, em `src/data/profiles.js`.
- **Hospedagem:** o TCC prevê a Vercel; a documentação de deploy do backend reserva a porta 1040 da VPS para o frontend.

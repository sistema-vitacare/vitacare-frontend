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

Os serviços devolvem dados simulados no mesmo formato da API do backend:

- sucesso: `{ data, meta }`, com `meta.pagination` nas listagens;
- erro: `{ error: { code, message, detail, fields }, meta }`, com `fields` preenchido nos erros de validação (status 422).

Cada serviço aplica um atraso curto e pode simular falha, de modo que os estados de carregamento e de erro das telas funcionam desde o início. Os dados simulados ficam em `src/data/mocks/` e usam nomes, documentos e contatos inventados. Nenhum dado pessoal real entra no repositório.

Na integração, o corpo de cada serviço passa a chamar a rota correspondente da API. Páginas e hooks não mudam.

Duas alternativas foram descartadas:

- **Importar os dados simulados direto nas páginas.** A integração exigiria alterar todas as telas.
- **Interceptar requisições HTTP com Mock Service Worker.** Exigiria definir rotas que a API ainda não tem, como painel, relatórios, auditoria e histórico, e colocaria um segundo service worker ao lado do PWA.

## Sessão, perfis e permissões

| Perfil | Código | Acesso |
| --- | --- | --- |
| Administrador | `admin` | Tudo o que o profissional de saúde faz, mais usuários, organização, plano, painel operacional e auditoria. |
| Profissional de saúde | `professional` | Pacientes, histórico e evolução, formulários, regras de alerta, anulação de registros, medicamentos, relatórios e vínculos de cuidado. |
| Cuidador | `caregiver` | Pacientes vinculados, registro de acompanhamento, alertas e consulta de medicamentos. |
| Familiar | `family` | Consulta do paciente vinculado: cadastro, histórico, evolução, alertas e medicamentos. |
| Administrador da plataforma | `platform_admin` | Organizações clientes e seus planos. |

A matriz de permissões replica `src/modules/Access/access.permissions.ts` do vitacare-backend, que é a fonte oficial. Mudança na matriz do backend precisa ser repetida aqui.

As telas consultam permissões, por exemplo `can('patients:create')`, e nunca o nome do perfil. Assim, uma mudança na matriz não exige alterar telas.

Apenas o cuidador registra acompanhamento. O administrador herda as permissões do profissional de saúde, não as do cuidador.

Enquanto os dados são simulados, o login oferece um usuário de demonstração para cada perfil.

## Identidade visual

A estrutura de telas segue os protótipos do TCC (Figuras 31 a 46). Os valores ficam no tema, em `src/styles/`; esta seção registra os critérios.

- **Uma cor de ação:** o teal da marca. Botões e links usam `#0D7D77`, com contraste de 4,98:1 sobre branco. O `#00B69B` dos protótipos tem 2,57:1, abaixo do mínimo de 4,5:1 da WCAG 2.1 (nível AA) para texto, e fica restrito a elementos decorativos, como o preenchimento de gráficos e o fundo de selos.
- **Texto:** azul-marinho do logotipo, `#183058`, com contraste de 13,1:1 sobre branco.
- **Cores de estado:** crítico, atenção, informativo e normal aparecem apenas para indicar situação clínica ou do sistema, nunca como decoração.
- **Superfícies:** fundo cinza-claro, cartões brancos com sombra difusa em tom azul-marinho e cantos arredondados.
- **Movimento:** transições curtas com desaceleração, entrada escalonada de listas e esqueletos de carregamento no formato do conteúdo. Animações usam apenas `transform` e `opacity` e respeitam a preferência do sistema por movimento reduzido.
- **Celular:** o cuidador navega por uma barra inferior, porque o registro de visita acontece com o aparelho na mão. Os demais perfis usam o menu lateral recolhível.

Os contrastes foram calculados pela fórmula de luminância relativa da WCAG 2.1.

## Diferenças em relação aos protótipos

| Tela | Protótipo | Implementação | Motivo |
| --- | --- | --- | --- |
| Login (Figura 31) | E-mail e senha | Código da organização, e-mail e senha | A API autentica o usuário dentro de uma organização. |
| Login (Figura 31) | Link "Inscreva-se" | Removido | Organizações são cadastradas pelo administrador da plataforma; não existe cadastro público. |
| Registro de visita (Figuras 38 e 40) | Sem indicação de perfil | Apenas cuidador | Matriz de permissões da API. |
| Medicamentos (Figura 41) | Percentual de adesão | Não exibido | A API não registra a tomada do medicamento. |
| Configurações (Figura 46) | Plano "Pro – Clínica" | Planos Basic e Enterprise | Catálogo do Quadro 2 do TCC, adotado pela API. |
| Configurações (Figura 46) | Autenticação em dois fatores e preferências de notificação | Não exibidos | Sem requisito funcional nem suporte na API. |
| Todas | Botões teal `#00B69B` com texto branco | Teal `#0D7D77` | Contraste mínimo para texto (WCAG 2.1 AA). |

Telas sem protótipo, necessárias para os fluxos da API: primeiro acesso (troca da senha provisória), equipe de cuidado do paciente, regras de alerta e, para o administrador da plataforma, organizações e planos.

## Testes

Os testes usam Vitest e Testing Library e ficam em `tests/`, espelhando as pastas de `src/`. A lógica, como permissões, máscaras, filtros, paginação e montagem de formulários dinâmicos, é escrita com o teste antes do código. As telas são testadas pelo comportamento visível: o que aparece em cada estado (carregando, vazio, erro, com dados) e o que cada perfil pode ou não fazer.

## Em aberto

Situação conforme o manual da API atualizado em 05/11/2026.

- **Usuário autenticado:** o login devolve apenas o token e o prazo da sessão, e não há rota que devolva o usuário logado com perfil e permissões. Sem ela, o frontend não consegue montar o menu depois da integração.
- **Recuperação de senha:** o protótipo (Figura 32) usa código de seis dígitos; a API usa link com token e, sem servidor de e-mail configurado, não entrega a mensagem. A tela segue o protótipo até a definição.
- **Alertas:** marcar como lido, resolver e notificar ainda não existem na API.
- **Hospedagem:** o TCC prevê a Vercel; a documentação de deploy do backend reserva a porta 1040 da VPS para o frontend.

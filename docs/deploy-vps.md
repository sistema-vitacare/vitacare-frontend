# Deploy na VPS (Portainer + GHCR)

Mesmo molde do [vitacare-backend](https://github.com/sistema-vitacare/vitacare-backend/blob/main/docs/deploy-vps.md): imagem no GHCR, stack *Repository* no Portainer, deploy por webhook e **um container por sistema**. No lugar do processo Node da API, o container roda um nginx sem root que serve os arquivos gerados pelo Vite.

```text
merge na main
  └─ GitHub Actions: verify (compose, lint, testes, build)
       └─ imagem: build → smoke com as restrições da stack → push no GHCR (:latest e :sha-<commit>)
            └─ deploy: webhook → Portainer relê o compose, baixa a imagem, recria app-vitacare-frontend
                 └─ entrypoint: valida API_URL, gera /config.js e a CSP → nginx na porta 1040
                      └─ o job espera /version.txt = commit e /healthz 200
log de acesso JSON (level_name) → Alloy → Loki · cAdvisor → Prometheus · /healthz → Kuma
```

| Item | Valor |
| --- | --- |
| Stack / label `stack` | `vitacare-frontend` |
| Container | `app-vitacare-frontend` |
| Porta (host = interna) | `1040` (a `1050` é a API do VitaCare) |
| Imagem | `ghcr.io/sistema-vitacare/vitacare-frontend` (`:latest` e `:sha-<commit>`) |
| Banco, Redis, volume | nenhum: o container não guarda estado |
| Redes | `proxy` (padrão das stacks); fora da `infra` |

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `Dockerfile` | estágio `build` (Node 24, `npm ci`, `vite build`, `.gz` pré-comprimidos, `version.txt`) e estágio `runtime` (nginx sem root, só os estáticos) |
| `.dockerignore` | lista de permissão: só entra no build o que o Dockerfile copia |
| `docker/nginx/templates/default.conf.template` | servidor na 1040: SPA, cache, gzip, log JSON, `/healthz`, `/config.js`, `/version.txt` |
| `docker/nginx/templates/security-headers.inc.template` | CSP e demais cabeçalhos de segurança |
| `docker/entrypoint.d/05-vitacare-env.sh` | valida `API_URL` e o tmpfs antes de o nginx subir |
| `docker-compose.prod.yml` | o que a stack do Portainer lê |
| `.env.production.example` | modelo das variáveis da stack |
| `compose.yaml` | ensaio local da imagem de produção |
| `scripts/ops/smoke-image.sh` | smoke da imagem por HTTP, no CI e local |
| `.github/workflows/deploy.yml` | `verify` → `imagem` → `deploy` |

## Configuração em tempo de execução

A mesma imagem serve qualquer ambiente; nada da VPS entra no build. Na subida, o entrypoint lê `API_URL` e:

- responde `/config.js` com `window.__VITACARE_CONFIG__ = { apiUrl }`, carregado pelo `index.html` antes do app. No desenvolvimento, quem responde é `public/config.js`, com a API do compose do backend (`http://localhost:3000`);
- põe a mesma origem no `connect-src` da Content-Security-Policy: o navegador só aceita chamadas para a própria origem e para a API.

`API_URL` é só a origem (`http://<IP-da-VPS>:1050`), sem caminho nem `/` no fim. Valor ausente ou fora desse formato faz o container sair com `ERRO: API_URL ...` no log, em vez de servir um frontend que não alcança a API.

## Servidor (nginx)

| Caminho | Resposta | Cache |
| --- | --- | --- |
| `/assets/*` | arquivo com hash no nome, `.gz` pré-comprimido; inexistente responde `404` | 1 ano, `immutable` |
| `/config.js` | configuração gerada da `API_URL` | `no-store` |
| `/version.txt` | commit da imagem | `no-store` |
| `/healthz` | `ok` | `no-store` |
| qualquer outro | arquivo de `public/` ou, se não existir, o `index.html` (rotas do React Router) | `no-cache` (revalida por ETag) |

- Só `GET` e `HEAD`; os demais métodos respondem `405`.
- O asset inexistente responde `404`, e não o `index.html`: depois de um deploy, uma aba aberta com a versão anterior que peça um chunk antigo recebe erro, e não HTML no lugar de JavaScript.
- **Cabeçalhos:** CSP sem script inline (`style-src 'unsafe-inline'` só pelo Emotion do MUI), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` e `Cross-Origin-Resource-Policy`. `Server` sem versão.
- **Log de acesso:** JSON de uma linha com `level_name` (`INFO`, `WARNING` para 4xx, `ERROR` para 5xx), caminho **sem query string**, método, status, bytes, duração, IP, user agent e `request_id`. A redefinição de senha traz o token em `?token=`: ele não vai para o log, e o `no-referrer` impede que saia no cabeçalho `Referer`.

## Segurança do container

| Medida | Onde |
| --- | --- |
| Processo sem root (uid 101), arquivos servidos com dono root (o nginx não os altera) | `Dockerfile` |
| Sistema de arquivos só leitura; escrita só em dois tmpfs (`/tmp` e `/etc/nginx/conf.d`) | `read_only`, `tmpfs` |
| Nenhuma capability (`cap_drop: ALL`) e `no-new-privileges` | compose |
| Limites de memória, CPU e processos | `mem_limit`, `cpus`, `pids_limit` |
| Fora da rede `infra`: o frontend não enxerga PostgreSQL nem Redis | `networks` |
| Nenhum `.env` na imagem (lista de permissão no `.dockerignore`) | `.dockerignore` |
| Actions fixadas por SHA; push no GHCR só na `main`, com o `GITHUB_TOKEN`; SBOM e procedência anexados à imagem | workflow |

### Por que sem Redis

O frontend é um conjunto de arquivos estáticos entregue pelo nginx: não há sessão, consulta nem cálculo no servidor para guardar em cache. O cache que importa é o do navegador (assets imutáveis por um ano) e o do sistema operacional (`open_file_cache` e page cache). Ligar o container ao Redis só acrescentaria uma dependência e um ponto de falha, e o colocaria na rede `infra`, ao lado do banco. O Redis continua útil onde já está, na API (cache, filas BullMQ).

## Recursos

| Variável | Padrão | Regra |
| --- | --- | --- |
| `APP_MEM_LIMIT` | `128m` | inclui os tmpfs (até 17 MB); o nginx usa poucos MB |
| `APP_CPUS` | `0.5` | arquivos estáticos e pré-comprimidos: pouca CPU |

Conferir depois de uma semana: `docker stats --no-stream app-vitacare-frontend`.

## Passo a passo do zero ao ar (acesso por IP, sem domínio)

O acesso é **sempre** por `http://<IP-da-VPS>:1040`, sem domínio nem HTTPS (decisão de Mateus em 2026-11-10, a mesma do backend). Fora de contexto seguro, o navegador não libera service worker: a instalação do PWA não funciona pelo IP.

### 0. Pré-requisitos na VPS

```bash
docker network ls --format '{{.Name}}' | grep -E '^proxy$'
docker ps --filter name=app-vitacare --format '{{.Names}}\t{{.Status}}'   # API no ar
```

### 1. Merge `develop` → `main`

O workflow roda `verify` ✅ e `imagem` ✅; o `deploy` ❌ falha com "Secret PORTAINER_WEBHOOK_URL não configurado", o esperado no primeiro merge. A imagem aparece em github.com/orgs/sistema-vitacare → Packages, **privada**. O registry `ghcr.io` cadastrado no Portainer para o backend serve aqui, se o token tiver acesso à org (Package settings → Manage access).

### 2. Firewall

hPanel → VPS → Segurança → Firewall → TCP `1040`. (O `ufw` não vale para porta publicada pelo Docker.)

### 3. Variáveis (`.env.production`, nunca commitado)

Sem aspas e sem comentário na mesma linha:

```dotenv
API_URL=http://<IP-da-VPS>:1050
APP_BIND=0.0.0.0
```

### 4. Stack no Portainer

Stacks → Add stack → **Repository**:

| Campo | Valor |
| --- | --- |
| Name | `vitacare-frontend` |
| Authentication | usuário GitHub + token fine-grained (Contents: Read-only) do repo |
| Repository URL / reference | `https://github.com/sistema-vitacare/vitacare-frontend` / `refs/heads/main` |
| Compose path | `docker-compose.prod.yml` |
| GitOps updates | ligado → *Webhook* → **copiar a URL** |
| Re-pull image / Force redeployment | desligados (pagos no CE; o `pull_policy: always` resolve) |
| Environment variables | *Advanced mode* → colar o `.env.production` |

**Deploy the stack.**

### 5. CORS na API

Na stack `vitacare` (backend), `CORS_ORIGINS=http://<IP-da-VPS>:1040` → **Update the stack**. Sem isso o navegador bloqueia as chamadas do frontend para a API.

### 6. Primeiro boot e validação de fora

```bash
docker ps --filter name=app-vitacare-frontend --format '{{.Names}}\t{{.Status}}'   # Up (healthy)
docker logs app-vitacare-frontend 2>&1 | grep -E "API_URL|ERRO"
curl -s http://<IP-da-VPS>:1040/version.txt    # commit do merge
curl -s http://<IP-da-VPS>:1040/config.js      # apiUrl da stack
curl -sI http://<IP-da-VPS>:1040/ | grep -i content-security-policy
```

### 7. GitHub

Settings → Secrets and variables → Actions: secret `PORTAINER_WEBHOOK_URL` (URL do passo 4) e variable `APP_URL=http://<IP-da-VPS>:1040`. Em Settings → Environments, o environment `production` é criado pelo primeiro deploy; nele é possível exigir aprovação antes de cada publicação. *Re-run all jobs* do workflow do passo 1: três jobs verdes, com `Versão <commit> no ar em <APP_URL>` no fim do `deploy`.

### 8. Monitoramento

**Uptime Kuma** (`http://<IP-da-VPS>:3001`), com a notificação SMTP:

| Monitor | Tipo | Alvo | Intervalo |
| --- | --- | --- | --- |
| `vitacare-frontend` | HTTP | `http://<IP-da-VPS>:1040/healthz` | 60 s |

Não há worker nem agendamento, então não há monitor Push. **Backup:** nada a copiar; a imagem de cada commit fica no GHCR (`:sha-<commit>`).

**Logs** (Grafana → Loki):

```logql
{stack="vitacare-frontend", level="ERROR"}                       # 5xx do nginx
{stack="vitacare-frontend"} | json | status >= 400                # erros de cliente e servidor
{stack="vitacare-frontend"} |= "ERRO"                             # configuração inválida na subida
```

## Antes do merge na main

O CI já roda o smoke da imagem em todo pull request. À mão, só quando mexer no Dockerfile, no nginx ou no compose e quiser ver no navegador:

```bash
docker compose up --build                       # http://localhost:1040, API em http://localhost:3000
# ou o mesmo smoke do CI:
docker build --target runtime --build-arg GIT_SHA="$(git rev-parse HEAD)" -t vitacare-frontend:ci .
IMAGE=vitacare-frontend:ci EXPECT_VERSION="$(git rev-parse HEAD)" sh scripts/ops/smoke-image.sh
```

De tempos em tempos: `npm audit --omit=dev --audit-level=high`.

## Dia a dia

| Quero... | Como |
| --- | --- |
| Publicar | merge na `main` (alguns segundos fora do ar enquanto o container é recriado) |
| Redeploy sem código novo | stack → **Pull and redeploy** |
| Atualizar o nginx e o Alpine da imagem (correção de segurança) | Actions → CI e deploy → **Run workflow** na `main`: o build resolve de novo a tag `1.30-alpine` e publica |
| Trocar a API | `API_URL` → **Update the stack** (sem rebuild) |
| Rollback | `APP_IMAGE=ghcr.io/sistema-vitacare/vitacare-frontend:sha-<commit>` → Update; apagar para voltar |
| Versão no ar | `curl http://<IP-da-VPS>:1040/version.txt` |

## Se algo falhar

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| `required variable API_URL is missing` | variável faltando na stack | passo 3 → Update |
| container reiniciando, log `ERRO: API_URL` | valor com aspas, caminho, `/` no fim ou `<IP-da-VPS>` literal | corrigir → Update |
| log `ERRO: /etc/nginx/conf.d sem permissão` | `tmpfs` removido do compose com `read_only` | restaurar o compose |
| `network proxy not found` | stack `proxy` fora do ar | subir a `proxy`, ou `PROXY_NETWORK=<nome>` |
| `pull access denied` no GHCR | token do registry sem acesso ao pacote | passo 1 |
| tela carrega, chamadas à API falham por CORS | origem do front fora do `CORS_ORIGINS` do backend | passo 5 |
| console: `Refused to connect ... Content Security Policy` | `API_URL` diferente da origem real da API | igualar → Update |
| timeout de fora, ok em `curl 127.0.0.1:1040` | firewall sem 1040 ou `APP_BIND` ausente | passos 2 e 3 |

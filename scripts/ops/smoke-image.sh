#!/bin/sh
# Smoke da IMAGEM de produção: o mesmo roteiro no CI (job `imagem`) e no
# ensaio local. Sobe o container com as restrições do docker-compose.prod.yml
# (read-only, tmpfs, sem capabilities, limites de memória e CPU) e confere por
# HTTP o que o deploy depende. Tudo que cria é removido no fim.
#
#   IMAGE=vitacare-frontend:ci EXPECT_VERSION=<commit> sh scripts/ops/smoke-image.sh
#
# Variáveis: IMAGE (obrigatória), EXPECT_VERSION (conteúdo esperado do
# /version.txt), SMOKE_PORT (porta local, padrão 18040).
set -eu

IMAGE=${IMAGE:?Defina IMAGE}
EXPECT_VERSION=${EXPECT_VERSION:-}
SMOKE_PORT=${SMOKE_PORT:-18040}
API_URL=http://api.smoke.test:1050
name="vitacare-frontend-smoke-$$"
base="http://127.0.0.1:$SMOKE_PORT"
work=$(mktemp -d)
failures=0

cleanup() {
  status=$?
  if [ "$status" -ne 0 ] || [ "$failures" -ne 0 ]; then
    echo "--- últimas linhas de $name"
    docker logs --tail 40 "$name" 2>&1 || true
  fi
  docker rm -f "$name" "$name-invalid" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

ok() { echo "ok   $1"; }
ko() {
  echo "FALHA $1"
  failures=$((failures + 1))
}
check() { # descrição comando...
  desc=$1
  shift
  if "$@"; then ok "$desc"; else ko "$desc"; fi
}

# Restrições iguais às do docker-compose.prod.yml.
run_hardened() { # nome API_URL [args extras do docker run]
  container=$1
  api_url=$2
  shift 2
  docker run -d --name "$container" \
    --read-only --tmpfs /tmp:size=16m \
    --tmpfs /etc/nginx/conf.d:uid=101,gid=101,mode=0700,size=1m \
    --cap-drop ALL --security-opt no-new-privileges:true \
    --memory 128m --cpus 0.5 --pids-limit 64 \
    -e API_URL="$api_url" "$@" "$IMAGE" >/dev/null
}

# get caminho [args do curl]: grava cabeçalhos e corpo em $work e imprime o
# status (000 sem conexão, para a verificação falhar sem abortar o roteiro).
get() {
  path=$1
  shift
  : >"$work/headers"
  curl -sS -o "$work/body" -D "$work/headers" -w '%{http_code}' "$@" "$base$path" || true
}
header() { grep -i "^$1:" "$work/headers" | head -n 1 | cut -d' ' -f2- | tr -d '\r'; }

# 1. Sobe e espera o healthcheck do Docker.
run_hardened "$name" "$API_URL" -p "127.0.0.1:$SMOKE_PORT:1040"
for _ in $(seq 1 30); do
  health=$(docker inspect -f '{{.State.Health.Status}}' "$name")
  [ "$health" = "healthy" ] && break
  [ "$(docker inspect -f '{{.State.Running}}' "$name")" = "true" ] || break
  sleep 1
done
check "container healthy com read-only, sem capabilities e com 128m" [ "$health" = "healthy" ]

# 2. Saúde e versão.
check "/healthz 200" [ "$(get /healthz)" = "200" ]
if [ -n "$EXPECT_VERSION" ]; then
  get /version.txt >/dev/null
  check "/version.txt = $EXPECT_VERSION" [ "$(cat "$work/body")" = "$EXPECT_VERSION" ]
fi
check "/version.txt sem cache" [ "$(get /version.txt; header Cache-Control)" = "200no-store" ]

# 3. SPA: raiz e rota profunda servem o index.html, revalidado a cada carga.
check "/ 200" [ "$(get /)" = "200" ]
check "/ com o #root do app" grep -q '<div id="root">' "$work/body"
check "/ com Cache-Control no-cache" [ "$(header Cache-Control)" = "no-cache" ]
check "rota do React Router (/painel) cai no index.html" [ "$(get /painel)" = "200" ]
check "rota do React Router com HTML" grep -q '<div id="root">' "$work/body"

# 4. Configuração de tempo de execução e cabeçalhos de segurança.
check "/config.js 200" [ "$(get /config.js)" = "200" ]
check "/config.js com a API_URL da stack" grep -q "apiUrl: \"$API_URL\"" "$work/body"
check "/config.js sem cache" [ "$(header Cache-Control)" = "no-store" ]
get / >/dev/null
check "CSP libera a API_URL no connect-src" sh -c "grep -i '^content-security-policy:' '$work/headers' | grep -q \"connect-src 'self' $API_URL;\""
check "CSP sem script inline" sh -c "grep -i '^content-security-policy:' '$work/headers' | grep -q \"script-src 'self';\""
check "X-Content-Type-Options nosniff" [ "$(header X-Content-Type-Options)" = "nosniff" ]
check "X-Frame-Options DENY" [ "$(header X-Frame-Options)" = "DENY" ]
check "Referrer-Policy no-referrer" [ "$(header Referrer-Policy)" = "no-referrer" ]
check "Server sem versão do nginx" [ "$(header Server)" = "nginx" ]
check "index.html sem script inline (a CSP o bloquearia)" sh -c "! grep -Eq '<script( type=\"module\")?>' '$work/body'"

# 5. Assets: cache imutável, gzip pré-comprimido, 404 para o que não existe.
asset=$(grep -o '/assets/index-[A-Za-z0-9_-]*\.js' "$work/body" | head -n 1)
check "index.html referencia o bundle em /assets/" [ -n "$asset" ]
check "$asset 200" [ "$(get "$asset" -H 'Accept-Encoding: gzip')" = "200" ]
check "$asset com cache imutável" [ "$(header Cache-Control)" = "public, max-age=31536000, immutable" ]
check "$asset entregue em gzip" [ "$(header Content-Encoding)" = "gzip" ]
check "$asset como JavaScript" sh -c "grep -i '^content-type:' '$work/headers' | grep -q 'application/javascript'"
check "asset inexistente 404, sem cair no index.html" [ "$(get /assets/nao-existe.js)" = "404" ]

# 6. Só GET e HEAD.
check "POST recusado com 405" [ "$(get / -X POST)" = "405" ]

# 7. Log de acesso: JSON de uma linha, com level_name e sem query string.
get '/redefinir-senha?token=segredo-do-smoke' >/dev/null
sleep 1
docker logs "$name" 2>/dev/null | grep '"path":"/redefinir-senha"' | tail -n 1 >"$work/log"
check "log de acesso em JSON com level_name" grep -q '"level_name":"INFO"' "$work/log"
check "log de acesso sem o token da query string" sh -c "! docker logs '$name' 2>&1 | grep -q 'segredo-do-smoke'"
docker logs "$name" 2>/dev/null | grep '"path":"/assets/nao-existe.js"' | tail -n 1 >"$work/log"
check "404 registrado como WARNING" grep -q '"level_name":"WARNING"' "$work/log"

# 8. API_URL inválida: o container não sobe.
run_hardened "$name-invalid" 'http://<IP-da-VPS>:1050'
for _ in $(seq 1 15); do
  [ "$(docker inspect -f '{{.State.Running}}' "$name-invalid")" = "false" ] && break
  sleep 1
done
state=$(docker inspect -f '{{.State.Running}} {{.State.ExitCode}}' "$name-invalid")
case "$state" in
  'false 0' | true*) check "API_URL inválida derruba a subida (estado: $state)" false ;;
  *) check "API_URL inválida derruba a subida (estado: $state)" true ;;
esac
check "API_URL inválida explicada no log" sh -c "docker logs '$name-invalid' 2>&1 | grep -q 'ERRO: API_URL'"

echo
if [ "$failures" -ne 0 ]; then
  echo "$failures verificação(ões) falharam"
  exit 1
fi
echo "Smoke da imagem $IMAGE: todas as verificações ok"

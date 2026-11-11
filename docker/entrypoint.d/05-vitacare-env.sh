#!/bin/sh
# Roda antes do 20-envsubst-on-templates.sh da imagem base. Uma configuração
# inválida derruba a subida (restart em loop com a mensagem no log) em vez de
# servir um frontend que não alcança a API ou que quebra a CSP.
set -eu

ME=$(basename "$0")
API_URL=${API_URL:-}

fail() {
  echo "$ME: ERRO: $1" >&2
  exit 1
}

# API_URL entra no nginx.conf, num cabeçalho e numa string JavaScript: só a
# origem, sem aspas, espaço, quebra de linha, caminho nem barra no fim.
case "$API_URL" in
  '' | *[!A-Za-z0-9.:/-]*)
    fail "API_URL ausente ou com caractere inválido: '$API_URL'. Use a origem da API, por exemplo http://<IP-da-VPS>:1050"
    ;;
esac
if ! printf '%s\n' "$API_URL" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$'; then
  fail "API_URL deve ser só a origem, sem caminho nem / no fim: '$API_URL'"
fi

# Com read_only: true, /etc/nginx/conf.d precisa de tmpfs. Sem ele a imagem
# base só avisaria e o nginx subiria sem nenhum server.
if [ ! -w /etc/nginx/conf.d ]; then
  fail "/etc/nginx/conf.d sem permissão de escrita (falta o tmpfs no compose?)"
fi

echo "$ME: API_URL=$API_URL"

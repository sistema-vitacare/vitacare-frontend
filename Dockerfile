# syntax=docker/dockerfile:1

# Versão principal do Node igual à do .nvmrc (o CI confere). O nginx segue a
# linha estável; o patch entra a cada build novo.
ARG NODE_VERSION=24
ARG NGINX_VERSION=1.30

# ---------- build: Node só aqui; a imagem final não carrega Node nem node_modules
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Dependências antes do código: mudar uma tela não refaz o `npm ci`. O .npmrc
# entra para valer o engine-strict (Node abaixo do mínimo falha no build).
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

# O config.js do desenvolvimento sai: em produção o nginx responde /config.js
# com a API_URL da stack. Os .gz pré-comprimidos são servidos pelo gzip_static.
RUN npm run build \
  && rm dist/config.js \
  && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \
       -o -name '*.svg' -o -name '*.json' -o -name '*.webmanifest' \) \
       -exec gzip -9 -k {} +

# Prova de versão no ar: o deploy espera /version.txt = commit do merge. Por
# último no estágio: muda a cada commit e invalidaria o cache do `npm ci`.
ARG GIT_SHA=dev
RUN echo "$GIT_SHA" > dist/version.txt

# ---------- runtime: nginx sem root (uid 101), só arquivos estáticos
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS runtime

# O default.conf da base escuta na 8080; o nosso vem dos templates.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY docker/nginx/templates/ /etc/nginx/templates/
COPY --chmod=755 docker/entrypoint.d/05-vitacare-env.sh /docker-entrypoint.d/
# Dono root: o processo do nginx lê, mas não altera, o que serve.
COPY --from=build /app/dist /usr/share/nginx/html

# O envsubst dos templates troca só esta variável; $uri, $status etc. ficam.
ENV NGINX_ENVSUBST_FILTER=^API_URL$

USER 101
EXPOSE 1040

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:1040/healthz || exit 1

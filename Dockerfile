# syntax=docker/dockerfile:1.7
#
# Imagen web: nginx sirve el panel (SPA Vite) y reenvia /api/* y /up al
# contenedor php-fpm de glucyai (servicio "app" en docker compose).
#
# Las VITE_* se hornean en el bundle en build time, por eso van como ARG.
# Build (desde glucyfront/):
#   docker build -t glucy-web --build-arg VITE_API_URL=/api .

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1/healthz || exit 1

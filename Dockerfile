# syntax=docker/dockerfile:1
# Multi-stage build of the HP Tracker PWA, served as static files by nginx.
#   docker build -t hoard-hp .
#   docker run -p 8080:8080 hoard-hp   →   http://localhost:8080

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
# Manifests first for better layer caching.
COPY package.json pnpm-lock.yaml ./
# The `prepare` lifecycle script wires git hooks from scripts/; it self-skips when there's
# no git work tree (the image has none — .git is dockerignored), but pnpm still needs the
# file to exist or the install aborts, so copy scripts/ BEFORE install (#259).
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
# Then sources + build (base "/" for self-hosting).
COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/ >/dev/null 2>&1 || exit 1

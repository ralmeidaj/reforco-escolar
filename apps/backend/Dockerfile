FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --filter=backend...

COPY apps/backend ./apps/backend

RUN pnpm --filter=backend build

# ------------------------------------

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production PORT=3000

# pnpm usa virtual store: root node_modules/.pnpm contém os pacotes reais;
# apps/backend/node_modules tem apenas symlinks que apontam para lá.
# Ambos precisam estar presentes no runner.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

WORKDIR /app/apps/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]

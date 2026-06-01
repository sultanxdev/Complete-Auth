FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/db/package.json ./packages/db/
RUN npm install --workspace=apps/server --workspace=packages/db --include-workspace-root

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 authserver

COPY --from=deps /app/node_modules ./node_modules
COPY apps/server/src ./apps/server/src
COPY apps/server/package.json ./apps/server/
COPY packages/db/src ./packages/db/src
COPY packages/db/package.json ./packages/db/

USER authserver
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "apps/server/src/index.js"]

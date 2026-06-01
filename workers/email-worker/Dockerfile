FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json ./
COPY workers/email-worker/package.json ./workers/email-worker/
RUN npm install --workspace=workers/email-worker --include-workspace-root

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

COPY --chown=worker:nodejs workers/email-worker/src ./workers/email-worker/src

USER worker

CMD ["node", "workers/email-worker/src/index.js"]

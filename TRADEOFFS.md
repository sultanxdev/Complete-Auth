# TRADEOFFS.md

## Engineering Tradeoffs in Complete Auth

This document explains non-obvious decisions made in this project, along with what we considered, what we chose, and why. Tradeoffs are first-class citizens of good engineering.

---

### 1. Express.js vs Hono vs Fastify

**Considered:** Hono (Web Standard, native Better Auth support), Fastify (high performance), Express (ubiquitous)

**Chose:** Express.js

**Why:**
- Universally understood — any team can maintain it
- Better Auth provides `toNodeHandler` for Express/Node compatibility
- Vast middleware ecosystem (Helmet, morgan, express-rate-limit, bull-board)
- No learning curve for new developers
- Performance is not the bottleneck in auth systems (DB round-trips dominate)

**Tradeoff:** Hono would be ~2x faster on benchmarks and uses Web Standard APIs. For an auth module, this difference is irrelevant.

---

### 2. SQLite (dev) → PostgreSQL (prod) via Drizzle

**Considered:** Always use Postgres (via Docker), always use SQLite, Turso (libSQL)

**Chose:** SQLite in dev, Postgres in prod, same Drizzle schema

**Why:**
- Zero-config dev setup (`git clone && npm install && npm run dev` — no Docker needed)
- Drizzle handles dialect switching transparently via `DATABASE_URL`
- Dramatically reduces onboarding friction for new contributors
- SQLite is production-grade for single-server apps anyway (Litestream replication exists)

**Tradeoff:** Schema tests in dev might miss PostgreSQL-specific behaviors (JSONB, array types). All CI tests run against SQLite too — integration testing against real Postgres would require the CI service (it's configured in `ci.yml`).

---

### 3. BullMQ over synchronous email delivery

**Considered:** Direct Resend API call in auth handler, BullMQ queue, simple setTimeout

**Chose:** BullMQ

**Why:**
- Email delivery failure must not fail auth operations (registration, password reset)
- Resend has intermittent latency (~50-200ms p99) — blocking auth on this would degrade UX
- BullMQ gives us: retries, exponential backoff, dead letter queue, monitoring (Bull Board)
- Jobs persist in Redis — survive server restarts

**Tradeoff:** Requires Redis even in development. Mitigated by Docker Compose. Without Redis, the server falls back gracefully (email just fails silently). For zero-dependency dev, direct email sending could be used as a `NODE_ENV=development` override.

---

### 4. No TypeScript (per PRD)

**Considered:** TypeScript strict mode, TypeScript loose mode, JSDoc + JavaScript

**Chose:** JavaScript with JSDoc comments

**Why:** PRD explicitly requires JavaScript. JSDoc provides IDE type hints and documents function signatures without a build step.

**Tradeoff:** No compile-time type safety. Mitigated by: Zod validation at runtime (env vars, API inputs), thorough unit tests, explicit JSDoc on all public functions.

---

### 5. Session storage in DB vs Redis-only

**Considered:** Redis-only sessions (fast but volatile), DB-only sessions (durable but slower), DB primary + Redis cache

**Chose:** DB primary (Better Auth default), with Redis as BullMQ store

**Why:**
- Sessions persisted in DB survive Redis restarts without data loss
- Better Auth's `cookieCache` (5-min client-side cache) eliminates most DB round-trips
- Redis is already required for BullMQ — no extra dependency
- Keeping sessions in DB makes them queryable for admin "list sessions" features

**Tradeoff:** For millions of concurrent users, Redis-only sessions would be faster. At that scale, the `cookieCache` option in Better Auth already covers 95% of reads.

---

### 6. `npm workspaces` vs Turborepo vs pnpm workspaces

**Considered:** Turborepo (build caching), pnpm workspaces (strict dependencies), npm workspaces (simple)

**Chose:** npm workspaces

**Why:**
- Zero additional tooling — every developer has npm
- For 3 workspaces, Turborepo's DAG caching is over-engineering
- pnpm's strict hoisting can cause unexpected issues with native modules (better-sqlite3)

**Tradeoff:** No incremental build caching. Can add Turborepo later as the project grows.

---

### 7. Apple OAuth as opt-in stub

**Considered:** Full Apple OAuth, disable entirely, opt-in stub

**Chose:** Stub (disabled by default, opt-in via env vars)

**Why:**
- Apple OAuth requires a paid Apple Developer account ($99/year)
- Requires server-side JWT signing (more complex than Google/GitHub)
- Requires domain verification files hosted on the production server
- Most projects targeting MENA/YC markets prioritize Google + GitHub first

**Tradeoff:** Missing a provider some iOS users expect. Comment in `auth.js` clearly shows how to re-enable once credentials are available.

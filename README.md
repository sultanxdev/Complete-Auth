# 🔐 Complete Auth

> **Production-ready authentication module built on [Better Auth](https://www.better-auth.com/).**  
> Drop into any JavaScript project. Every auth feature you need, zero lock-in.

[![CI](https://github.com/yourusername/complete-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/complete-auth/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-brightgreen)](https://nodejs.org/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.x-purple)](https://www.better-auth.com/)

---

## ✨ Features

| Feature | Status |
|---|---|
| Email & Password + verification | ✅ |
| Social OAuth (Google, GitHub) | ✅ |
| Apple OAuth | 🔧 Configurable |
| Magic Link / Passwordless | ✅ |
| Two-Factor Auth (TOTP + backup codes) | ✅ |
| Session management (sliding window, remember-me) | ✅ |
| RBAC (guest → user → moderator → admin) | ✅ |
| Account linking (same email, different providers) | ✅ |
| Admin panel (ban, role, force logout) | ✅ |
| Audit logging | ✅ |
| Async email queue (BullMQ + Redis) | ✅ |
| Beautiful dark-mode UI (Next.js 15) | ✅ |
| Rate limiting | ✅ |
| Security headers (CSP, Helmet) | ✅ |
| Docker Compose (all services) | ✅ |
| GitHub Actions CI | ✅ |

---

## 🏗️ Architecture

```
apps/server/          Express.js + Better Auth API        :4000
apps/web/             Next.js 15 App Router (JSX)         :3000
packages/db/          Drizzle ORM schema (SQLite/Postgres)
workers/email-worker/ BullMQ async email consumer
```

→ See [docs/architecture.md](./docs/architecture.md) for the full system diagram and design decisions.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Redis (for email queue) — or use Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/yourusername/complete-auth.git
cd complete-auth
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with at minimum:

```bash
BETTER_AUTH_SECRET=your-secret-min-32-chars-here
DATABASE_URL=file:./dev.db        # SQLite for local dev
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Initialize the database

```bash
npm run db:push -w packages/db
```

### 4. Run all services

```bash
npm run dev
```

This starts:
- **Express API** → http://localhost:4000
- **Next.js UI** → http://localhost:3000
- **Email Worker** → background process

Open http://localhost:3000 to see the auth UI.

---

## 🐳 Docker (Full Stack)

Runs everything with one command — Postgres, Redis, API, Web, Worker:

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker compose up

# Run DB migrations
docker compose exec server node -e "
  const { db } = await import('./packages/db/src/index.js');
  // migrations run automatically via drizzle-kit
"
```

Services:
| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:4000 |
| Bull Board (queue monitor) | http://localhost:4000/admin/queues |
| Health check | http://localhost:4000/health |

---

## 📁 Project Structure

```
complete-auth/
├── apps/
│   ├── server/                    Express.js + Better Auth
│   │   └── src/
│   │       ├── index.js           App entrypoint
│   │       ├── auth.js            Better Auth config (all plugins)
│   │       ├── config.js          Zod env validation
│   │       ├── logger.js          Pino structured logger
│   │       ├── redis.js           Redis singleton
│   │       ├── queue.js           BullMQ producer
│   │       ├── middleware/
│   │       │   ├── require-auth.js
│   │       │   ├── require-role.js  RBAC middleware
│   │       │   └── audit-log.js
│   │       └── routes/
│   │           ├── admin.js       Admin REST API
│   │           └── health.js      Health checks
│   └── web/                       Next.js 15 App Router
│       └── src/
│           ├── app/
│           │   ├── login/
│           │   ├── register/
│           │   ├── forgot-password/
│           │   ├── reset-password/
│           │   ├── magic-link/
│           │   ├── 2fa/
│           │   ├── dashboard/
│           │   ├── settings/
│           │   └── admin/users/
│           ├── components/
│           │   └── OAuthButtons.jsx
│           └── lib/
│               └── auth-client.js
├── packages/
│   └── db/
│       └── src/
│           ├── schema.js          Drizzle schema (all tables)
│           └── index.js           DB connection (SQLite/PG)
├── workers/
│   └── email-worker/
│       └── src/index.js           BullMQ consumer + templates
├── docs/
│   ├── architecture.md
│   ├── db-schema.md
│   └── api-flow.md
├── .github/workflows/ci.yml      GitHub Actions CI
├── docker-compose.yml
├── TRADEOFFS.md
├── SECURITY.md
└── CHANGELOG.md
```

---

## 🔐 Auth Flows

### Email & Password

```
Register → Email verification → Auto sign-in → Dashboard
Forgot password → Reset link → New password → All sessions revoked
Login → (2FA check) → Dashboard
```

### OAuth

```
Click "Sign in with Google/GitHub" → OAuth consent → Callback
→ Account linked (same email) OR new account created → Dashboard
```

### Magic Link

```
Enter email → "Magic link sent" (no enumeration) → Click link
→ Token validated (15 min TTL, single-use) → Session → Dashboard
```

### Two-Factor

```
Login (password OK) → twoFactorRedirect → /2fa page
→ Enter TOTP code (or backup code) → Session created → Dashboard
```

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (cost 12)
- Session tokens: **cryptographically random** (32 bytes)
- All verification tokens: **SHA-256 hashed** before DB storage
- **HTTP-only cookies** — session token inaccessible to JavaScript
- **SameSite=Lax** — CSRF protection compatible with OAuth redirects
- **Helmet** — all security headers including Content-Security-Policy
- **Rate limiting** — per-endpoint limits (5 login attempts / 15 min)
- **Audit log** — every auth event recorded with IP and user agent
- **No enumeration** — password reset, magic link, verify email all return generic success
- `npm audit` runs on every CI build

---

## 🔑 Environment Variables

See [.env.example](./.env.example) for the complete, documented list.

**Required for local dev:**
```bash
BETTER_AUTH_SECRET=         # min 32 chars
DATABASE_URL=file:./dev.db  # SQLite
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=             # from resend.com
EMAIL_FROM=                 # your from address
```

**For OAuth (optional in dev):**
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## 🧪 Testing

```bash
# Unit + integration tests (Vitest)
npm run test

# Run with coverage
npm run test:coverage -w apps/server

# E2E tests (Playwright)
npm run test:e2e -w apps/web
```

Coverage targets:
- Unit: 90%+
- Integration: 80%+
- E2E: All critical happy paths

---

## 📡 API Reference

All auth endpoints: `/api/auth/**` (handled by Better Auth)

### Public

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register |
| POST | `/api/auth/sign-in/email` | Login |
| POST | `/api/auth/sign-in/magic-link` | Request magic link |
| POST | `/api/auth/forget-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/verify-email` | Verify email token |
| GET | `/api/auth/sign-in/social` | Start OAuth |

### Authenticated

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/get-session` | Current session |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/list-sessions` | All active sessions |
| POST | `/api/auth/revoke-session` | Revoke session |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/two-factor/enable` | Enable 2FA |
| POST | `/api/auth/two-factor/verify-totp` | Verify 2FA code |
| POST | `/api/auth/two-factor/disable` | Disable 2FA |

### Admin (role: admin)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List users (paginated) |
| PATCH | `/api/admin/users/:id/role` | Change role |
| POST | `/api/admin/users/:id/ban` | Ban user |
| POST | `/api/admin/users/:id/unban` | Unban user |
| POST | `/api/admin/users/:id/force-logout` | Revoke all sessions |
| GET | `/api/admin/audit-logs` | View audit trail |

---

## 📈 Scaling Plan

→ See [docs/architecture.md](./docs/architecture.md#key-design-decisions)

At scale:
1. **Horizontal server scaling** — Express is stateless, load balance freely
2. **Redis session cache** — Enable Better Auth `rateLimit.storage: 'redis'` for multi-instance rate limits
3. **Read replicas** — Add Postgres read replica for `GET /admin/users` and audit log queries
4. **Worker scaling** — Run multiple email-worker instances (BullMQ handles concurrency natively)
5. **CDN for Next.js** — Deploy static assets to CDN, use Next.js ISR for auth pages

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for how to report vulnerabilities.

## 📄 License

[MIT](./LICENSE) © 2026 Uttam

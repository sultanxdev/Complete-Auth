# Architecture

## System Overview

Complete Auth is a monorepo containing three independently deployable services:

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                           │
│  Next.js 15 App Router (JSX)          :3000                 │
│  ├── Auth pages (login, register, 2FA, settings, admin)    │
│  ├── Better Auth browser client                             │
│  └── Zustand session store                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP (cookies)
                              │ Proxy: /api/* → :4000
┌─────────────────────────────▼───────────────────────────────┐
│  API SERVER (Express.js)              :4000                 │
│  ├── Helmet + CORS + Pino HTTP                              │
│  ├── Better Auth handler (/api/auth/**)                     │
│  │   ├── Email/password + verification                      │
│  │   ├── OAuth: Google, GitHub                              │
│  │   ├── Magic link (passwordless)                          │
│  │   ├── TOTP 2FA + backup codes                            │
│  │   ├── Session management (sliding window)               │
│  │   └── Admin plugin (RBAC, ban, force logout)             │
│  ├── Admin REST routes (/api/admin/**)                      │
│  ├── Health checks (/health, /health/ready)                 │
│  └── Bull Board (/admin/queues)                             │
└───────────┬──────────────────┬──────────────────────────────┘
            │ DB writes        │ Queue producer
            │                  │
┌───────────▼──────┐  ┌────────▼──────────────────────────────┐
│  DATABASE        │  │  REDIS                        :6379   │
│  SQLite (dev)    │  │  ├── BullMQ email queue (AOF)         │
│  PostgreSQL (prod│  │  └── Session cache                     │
│  ├── users       │  └───────────────┬───────────────────────┘
│  ├── sessions    │                  │ Queue consumer
│  ├── accounts    │  ┌───────────────▼───────────────────────┐
│  ├── verifications  │  EMAIL WORKER (BullMQ)                │
│  ├── twoFactors  │  │  ├── Concurrency: 5                   │
│  └── auditLogs   │  │  ├── Retry: 3× exponential backoff    │
└──────────────────┘  │  ├── Rate limit: 50 jobs/s            │
                       │  └── Resend API delivery              │
                       └───────────────────────────────────────┘
```

## Key Design Decisions

### Why Express.js?
- Universally understood by FAANG and startup teams alike
- `toNodeHandler` adapter from Better Auth provides native support
- Vast ecosystem for middleware (Helmet, morgan, rate-limiter-flexible)
- Simple to extend, test, and debug

### Why Next.js 15 App Router?
- Server Components allow session validation without client JS
- Built-in file-based routing reduces boilerplate
- Rewrites proxy `/api/*` to Express server — clean separation of concerns
- Production-grade SSR/SSG capabilities if needed later

### Why BullMQ for emails?
**Problem:** Synchronous email delivery blocks auth API responses. If Resend has latency, registration times degrade.

**Solution:** Enqueue email jobs immediately, return HTTP response, process asynchronously.

- Registration response: ~50ms (just DB write)
- Email delivery: happens in background, 3x retry with exponential backoff
- Queue persists in Redis (survives server restarts)

### Why SQLite in development?
- Zero config — works on any machine without Docker
- Drizzle ORM handles dialect switching transparently
- Same schema, same queries, just `DATABASE_URL=file:./dev.db`
- Switch to PostgreSQL in production via env var change

### Session Architecture
Sessions use a **sliding window** approach:
- Default TTL: 24 hours
- Remember Me TTL: 30 days  
- Session "refreshes" if accessed after `updateAge` (1 hour)
- HTTP-only cookie, Secure+SameSite=Lax in production

### Security Headers
Every response includes:
- `Content-Security-Policy` — restricts script/style/connect sources
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera/mic/geolocation

## Request Flow: Registration

```
1. User submits registration form (name, email, password)
2. Better Auth validates input (min length, format)
3. Bcrypt hash password (cost 12)
4. INSERT user row (emailVerified=false, role='user')
5. Generate email verification token (SHA-256 hashed in DB)
6. enqueueEmail('verify-email', { to, url }) → Redis
7. Return 200 OK + session cookie
8. [background] Email worker dequeues job
9. [background] Resend API sends HTML email
10. User clicks link → GET /api/auth/verify-email?token=...
11. Token validated, user.emailVerified=true, auto sign-in
```

## Request Flow: 2FA Login

```
1. User submits email + password
2. Better Auth validates credentials
3. Detects user has 2FA enabled → returns twoFactorRedirect
4. Client redirects to /2fa page
5. User enters 6-digit TOTP code
6. Better Auth validates TOTP (±30s window)
7. Session created, cookie set
8. Redirect to /dashboard
```

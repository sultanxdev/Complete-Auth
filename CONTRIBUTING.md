## How to Contribute

Thank you for your interest in contributing to Complete Auth!

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/complete-auth.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and fill in required values
5. Initialize the database: `npm run db:push -w packages/db`
6. Start dev servers: `npm run dev`

### Branch Naming

```
feature/add-passkey-support
bugfix/fix-oauth-state-mismatch
refactor/extract-email-service
hotfix/patch-token-expiry-edge-case
```

### Commit Messages

Follow the format: `<type>: <short description>`

```
feat: add passkey authentication support
fix: resolve race condition in token validation
refactor: extract email service from auth handler
docs: update API reference for admin endpoints
test: add integration tests for magic link flow
chore: update better-auth to v1.3.0
```

### Pull Request Process

1. Create a branch from `develop`
2. Make your changes with tests
3. Run `npm run lint && npm run test`
4. Open a PR against `develop` with:
   - **Why**: What problem does this solve?
   - **What**: Key architectural decisions
   - **Tradeoffs**: What alternatives were considered?
   - **Limitations**: Any known limitations?
   - **Future work**: What could be improved later?

### Code Standards

- JavaScript (ES2022, ESM)
- JSDoc comments on all exported functions
- Vitest for unit and integration tests
- Playwright for E2E tests
- Pino for structured logging (no `console.log` in production code)
- Zod for all runtime validation

### Security Bugs

Please see [SECURITY.md](./SECURITY.md) — do **not** open a GitHub issue.

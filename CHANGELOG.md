# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06

### Added
- Email & password authentication with email verification
- Social OAuth: Google, GitHub (Apple stubbed)
- Magic link / passwordless sign-in
- Two-factor authentication (TOTP + backup codes)
- Session management with sliding window TTL, remember-me
- Role-based access control (RBAC): guest, user, moderator, admin
- Account linking across OAuth providers
- Admin API: user management, ban/unban, force logout, role assignment
- Audit logging for all security events
- BullMQ async email queue with Resend delivery
- Beautiful HTML email templates (dark theme)
- Rate limiting on all auth endpoints
- Security headers (Helmet + CSP)
- Next.js 15 App Router UI: login, register, 2FA, magic link, settings, admin
- Glassmorphism dark theme design system
- Docker Compose with PostgreSQL, Redis, server, web, worker
- GitHub Actions CI: lint, test, coverage, E2E, Docker build, security audit
- npm workspaces monorepo: apps/server, apps/web, packages/db, workers/email-worker
- Comprehensive documentation: architecture, db-schema, tradeoffs, security policy

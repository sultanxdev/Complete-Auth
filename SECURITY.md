# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active  |

## Reporting a Vulnerability

**Do not open a GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by emailing: **security@yourdomain.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will acknowledge receipt within **48 hours** and aim to release a fix within **7 days** for critical issues.

## Security Architecture

- All passwords hashed with bcrypt (cost factor 12)
- Session tokens are cryptographically random (32 bytes via `crypto.randomUUID`)
- All tokens (reset, verify, magic link) are SHA-256 hashed before DB storage
- HTTP-only, Secure, SameSite=Lax cookies for sessions
- CSRF protection via SameSite cookie policy
- No sensitive data in application logs (redacted by Pino)
- Secrets managed via environment variables (never in code)
- `npm audit` runs on every CI build

## Disclosure Policy

We follow **responsible disclosure**. Upon fix release, we will:
1. Credit the reporter (if they wish)
2. Publish a CVE if applicable
3. Update CHANGELOG.md with the security fix details

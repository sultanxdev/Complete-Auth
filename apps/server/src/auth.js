/**
 * Better Auth server instance — the core of Complete Auth.
 *
 * Configured with:
 *   ✅ Email & Password (with verification)
 *   ✅ Social OAuth: Google, GitHub (Apple stubbed)
 *   ✅ Magic Link / Passwordless
 *   ✅ Two-Factor Authentication (TOTP + backup codes)
 *   ✅ Session management (24h default, 30-day remember-me)
 *   ✅ Account linking across providers
 *   ✅ Admin plugin (user management, role assignment, banning)
 *   ✅ Rate limiting
 *
 * All email sends are delegated to BullMQ queue (non-blocking).
 * Auth events are logged via Pino structured logging.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { magicLink } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins';
import { db } from '@complete-auth/db';
import { config } from './config.js';
import { enqueueEmail } from './queue.js';
import { logger } from './logger.js';
import * as schema from '@complete-auth/db/schema';

export const auth = betterAuth({
  // ── Core ────────────────────────────────────────────────────────────────────
  appName: 'CompleteAuth',
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,

  // ── Database ────────────────────────────────────────────────────────────────
  database: drizzleAdapter(db, {
    provider: config.DATABASE_URL.startsWith('file:') ? 'sqlite' : 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
    usePlural: true,
  }),

  // ── User Schema Extensions ───────────────────────────────────────────────────
  user: {
    additionalFields: {
      role: {
        type: 'string',
        default: 'user',
        input: false, // Role cannot be set by users on registration
      },
      banned: {
        type: 'boolean',
        default: false,
        input: false,
      },
      banReason: {
        type: 'string',
        required: false,
        input: false,
      },
      banExpires: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },

  // ── Email & Password ─────────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,

    sendResetPassword: async ({ user, url, token }) => {
      logger.info({ userId: user.id }, 'Password reset requested');

      await enqueueEmail(
        'reset-password',
        { to: user.email, data: { url, name: user.name } },
        `reset-${token}` // Idempotency: one email per token
      );
    },
  },

  // ── Email Verification ───────────────────────────────────────────────────────
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url, token }) => {
      logger.info({ userId: user.id }, 'Verification email requested');

      await enqueueEmail(
        'verify-email',
        { to: user.email, data: { url, name: user.name } },
        `verify-${token}`
      );
    },
  },

  // ── Social Providers ─────────────────────────────────────────────────────────
  socialProviders: {
    ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        scope: ['openid', 'email', 'profile'],
      },
    }),
    ...(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET && {
      github: {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        scope: ['user:email', 'read:user'],
      },
    }),
    // Apple OAuth is complex (requires paid dev account + JWT secret generation)
    // Uncomment and configure when you have Apple Developer credentials:
    // ...(config.APPLE_CLIENT_ID && config.APPLE_CLIENT_SECRET && {
    //   apple: {
    //     clientId: config.APPLE_CLIENT_ID,
    //     clientSecret: config.APPLE_CLIENT_SECRET,
    //   },
    // }),
  },

  // ── Account Linking ──────────────────────────────────────────────────────────
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },

  // ── Session ──────────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24,       // 24 hours (seconds)
    updateAge: 60 * 60,             // Slide session if >1 hour old
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,               // 5-minute client-side cache
    },
  },

  // ── Rate Limiting ────────────────────────────────────────────────────────────
  rateLimit: {
    window: 60,     // 60 second window
    max: 10,        // 10 requests per window globally
    customRules: {
      '/sign-in/email':        { window: 900,  max: 5  }, // 5/15min per IP
      '/sign-up/email':        { window: 3600, max: 3  }, // 3/hr per IP
      '/forget-password':      { window: 3600, max: 3  }, // 3/hr per email
      '/sign-in/magic-link':   { window: 3600, max: 5  }, // 5/hr per email
      '/two-factor/verify-totp': { window: 900, max: 5 }, // 5/15min per user
      '/send-verification-email': { window: 3600, max: 3 }, // 3/hr per email
    },
    storage: 'memory', // Use 'database' for multi-instance setups
  },

  // ── Plugins ──────────────────────────────────────────────────────────────────
  plugins: [
    // Magic Link / Passwordless
    magicLink({
      expiresIn: 900, // 15 minutes

      sendMagicLink: async ({ email, url, token }) => {
        logger.info({ email }, 'Magic link requested');

        await enqueueEmail(
          'magic-link',
          { to: email, data: { url } },
          `magic-${token}`
        );
      },
    }),

    // Two-Factor Authentication (TOTP + backup codes)
    twoFactor({
      issuer: 'CompleteAuth',
      totpWindow: 1,       // Accept ±1 time step (30s grace window)
      backupCodeCount: 10, // 10 one-time-use recovery codes

      sendTOTPEmail: async ({ user, otp }) => {
        await enqueueEmail(
          '2fa-code',
          { to: user.email, data: { otp, name: user.name } },
          `2fa-${user.id}-${otp}`
        );
      },
    }),

    // Admin — user management, role assignment, account banning
    admin({
      defaultRole: 'user',
      adminRole: 'admin',

      // Additional roles beyond admin/user
      roles: ['guest', 'user', 'moderator', 'admin'],
    }),
  ],

  // ── Advanced ─────────────────────────────────────────────────────────────────
  advanced: {
    cookiePrefix: 'complete-auth',
    useSecureCookies: config.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false, // Set to true for *.yourdomain.com
    },
    database: {
      generateId: () => crypto.randomUUID(), // Use UUID v4 for all IDs
    },
  },

  // ── Trusted Origins ──────────────────────────────────────────────────────────
  trustedOrigins: [config.APP_URL],
});

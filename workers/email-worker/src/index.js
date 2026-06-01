/**
 * Email Worker — BullMQ consumer.
 *
 * Runs as a standalone Node.js process, completely decoupled from the API server.
 * Consumes email jobs from Redis and delivers via Resend.
 *
 * Job types:
 *   - verify-email
 *   - reset-password
 *   - magic-link
 *   - 2fa-code
 *   - welcome
 *
 * Retry strategy (configured in server's queue.js):
 *   3 attempts, exponential backoff: 5s → 25s → 125s
 *
 * To run:  node src/index.js
 * In dev:  npm run dev -w workers/email-worker
 */

import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Resend } from 'resend';
import pino from 'pino';

// ── Logger ────────────────────────────────────────────────────────────────────

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  base: { service: 'email-worker' },
});

// ── Email Client ──────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = `${process.env.EMAIL_FROM_NAME ?? 'CompleteAuth'} <${process.env.EMAIL_FROM ?? 'noreply@yourdomain.com'}>`;

// ── Redis ─────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ── Email Templates ───────────────────────────────────────────────────────────

/**
 * Generates HTML email content for each job type.
 *
 * @param {'verify-email' | 'reset-password' | 'magic-link' | '2fa-code' | 'welcome'} type
 * @param {Record<string, any>} data
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildEmail(type, data) {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 600px; margin: 0 auto; background: #0f0f23;
    color: #e2e8f0; border-radius: 12px; overflow: hidden;
  `;

  const buttonStyle = `
    display: inline-block; padding: 14px 32px; border-radius: 8px;
    text-decoration: none; font-weight: 600; font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; margin: 24px 0;
  `;

  const headerStyle = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 32px 40px; border-bottom: 1px solid rgba(102, 126, 234, 0.3);
  `;

  const bodyStyle = `padding: 40px; background: #0f0f23;`;

  const footerStyle = `
    padding: 24px 40px; background: #0a0a1a;
    color: #64748b; font-size: 13px; text-align: center;
    border-top: 1px solid rgba(255,255,255,0.05);
  `;

  const header = (title) => `
    <div style="${headerStyle}">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:18px;">🔐</div>
        <span style="font-size:20px;font-weight:700;color:#e2e8f0;">CompleteAuth</span>
      </div>
      <h1 style="margin:20px 0 0;font-size:24px;color:#fff;">${title}</h1>
    </div>
  `;

  const footer = `
    <div style="${footerStyle}">
      <p>This email was sent by CompleteAuth. If you didn't request this, you can safely ignore it.</p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} CompleteAuth. All rights reserved.</p>
    </div>
  `;

  switch (type) {
    case 'verify-email':
      return {
        subject: 'Verify your email address — CompleteAuth',
        html: `<div style="${baseStyle}">
          ${header('Verify your email')}
          <div style="${bodyStyle}">
            <p>Hi ${data.name ?? 'there'},</p>
            <p>Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
            <a href="${data.url}" style="${buttonStyle}">Verify Email Address</a>
            <p style="color:#94a3b8;font-size:14px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</p>
            <p style="color:#64748b;font-size:13px;word-break:break-all;">Or copy this URL: ${data.url}</p>
          </div>
          ${footer}
        </div>`,
        text: `Hi ${data.name ?? 'there'},\n\nVerify your email: ${data.url}\n\nThis link expires in 24 hours.`,
      };

    case 'reset-password':
      return {
        subject: 'Reset your password — CompleteAuth',
        html: `<div style="${baseStyle}">
          ${header('Reset your password')}
          <div style="${bodyStyle}">
            <p>Hi ${data.name ?? 'there'},</p>
            <p>We received a request to reset your password. Click the button below to choose a new password.</p>
            <a href="${data.url}" style="${buttonStyle}">Reset Password</a>
            <p style="color:#94a3b8;font-size:14px;">This link expires in <strong>1 hour</strong> and can only be used once.</p>
            <p style="color:#f87171;font-size:14px;">If you didn't request a password reset, your account may be at risk. <a href="${data.url}" style="color:#f87171;">Click here immediately to secure it.</a></p>
          </div>
          ${footer}
        </div>`,
        text: `Hi ${data.name ?? 'there'},\n\nReset your password: ${data.url}\n\nThis link expires in 1 hour.`,
      };

    case 'magic-link':
      return {
        subject: 'Your login link — CompleteAuth',
        html: `<div style="${baseStyle}">
          ${header('Your magic login link')}
          <div style="${bodyStyle}">
            <p>Click the button below to sign in. No password needed.</p>
            <a href="${data.url}" style="${buttonStyle}">Sign In Now</a>
            <p style="color:#94a3b8;font-size:14px;">This link expires in <strong>15 minutes</strong> and can only be used once.</p>
            <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          ${footer}
        </div>`,
        text: `Sign in to CompleteAuth: ${data.url}\n\nThis link expires in 15 minutes.`,
      };

    case '2fa-code':
      return {
        subject: `Your verification code: ${data.otp} — CompleteAuth`,
        html: `<div style="${baseStyle}">
          ${header('Two-factor verification')}
          <div style="${bodyStyle}">
            <p>Hi ${data.name ?? 'there'},</p>
            <p>Your verification code is:</p>
            <div style="text-align:center;margin:32px 0;">
              <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#667eea;font-family:monospace;">${data.otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:14px;">This code expires in <strong>10 minutes</strong>. Never share this code with anyone.</p>
          </div>
          ${footer}
        </div>`,
        text: `Your verification code: ${data.otp}\n\nExpires in 10 minutes. Never share this code.`,
      };

    case 'welcome':
      return {
        subject: `Welcome to CompleteAuth, ${data.name ?? 'there'}!`,
        html: `<div style="${baseStyle}">
          ${header('Welcome to CompleteAuth 🎉')}
          <div style="${bodyStyle}">
            <p>Hi ${data.name ?? 'there'},</p>
            <p>Your account is all set up and ready to go. Here's what you can do:</p>
            <ul style="padding-left:20px;color:#94a3b8;">
              <li style="margin:8px 0;">🔑 Sign in with email/password or social providers</li>
              <li style="margin:8px 0;">🛡️ Enable two-factor authentication for extra security</li>
              <li style="margin:8px 0;">📱 Manage your active sessions</li>
            </ul>
            <a href="${data.dashboardUrl ?? '#'}" style="${buttonStyle}">Go to Dashboard</a>
          </div>
          ${footer}
        </div>`,
        text: `Welcome to CompleteAuth, ${data.name ?? 'there'}! Your account is ready.`,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  'email',
  async (job) => {
    const { to, data } = job.data;

    logger.info({ jobId: job.id, type: job.name, to }, 'Processing email job');

    const { subject, html, text } = buildEmail(job.name, data);

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      headers: {
        'X-Job-ID': job.id,
        'X-Job-Type': job.name,
      },
    });

    if (error) {
      logger.error({ jobId: job.id, error }, 'Resend API error');
      throw new Error(`Resend error: ${error.message}`);
    }

    logger.info({ jobId: job.id, type: job.name, to }, 'Email delivered successfully');
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 emails simultaneously
    limiter: {
      max: 50,          // Max 50 jobs per duration
      duration: 1000,   // Per 1 second (Resend rate limit buffer)
    },
  }
);

// ── Worker Events ─────────────────────────────────────────────────────────────

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, type: job.name }, 'Email job completed');
});

worker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, type: job?.name, attemptsMade: job?.attemptsMade, err },
    'Email job failed'
  );
});

worker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Email job stalled — will be retried');
});

worker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down email worker');
  await worker.close();
  await redis.quit();
  logger.info('Email worker stopped');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info(
  { concurrency: 5, queue: 'email' },
  '📧 Email worker started — listening for jobs'
);

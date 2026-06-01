/**
 * Email queue — BullMQ producer.
 *
 * The server adds jobs to this queue; the email-worker process
 * consumes them asynchronously. This decoupling means:
 *   - Auth API responses are never blocked waiting for email delivery
 *   - Emails are retried automatically on failure
 *   - Queue is persistent in Redis (survives server restarts)
 *
 * Job types:
 *   - verify-email
 *   - reset-password
 *   - magic-link
 *   - 2fa-code
 *   - welcome
 */

import { Queue } from 'bullmq';
import { getRedisClient } from './redis.js';
import { logger } from './logger.js';

const EMAIL_QUEUE_NAME = 'email';

let emailQueue = null;

/**
 * Get the singleton email queue instance.
 *
 * @returns {Queue}
 */
export function getEmailQueue() {
  if (emailQueue) {
    return emailQueue;
  }

  emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection: getRedisClient(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s → 25s → 125s
      },
      removeOnComplete: { count: 100 }, // Keep last 100 completed
      removeOnFail: { count: 500 },     // Keep last 500 failed for debugging
    },
  });

  emailQueue.on('error', (err) => {
    logger.error({ err, queue: EMAIL_QUEUE_NAME }, 'Email queue error');
  });

  return emailQueue;
}

/**
 * Enqueue an email job.
 *
 * @param {'verify-email' | 'reset-password' | 'magic-link' | '2fa-code' | 'welcome'} type
 * @param {{ to: string, data: Record<string, any> }} payload
 * @param {string} [idempotencyKey] - Optional dedup key (prevents duplicate sends)
 */
export async function enqueueEmail(type, payload, idempotencyKey) {
  const queue = getEmailQueue();

  const jobOptions = idempotencyKey
    ? { jobId: idempotencyKey } // BullMQ deduplicates by jobId
    : {};

  const job = await queue.add(type, payload, jobOptions);

  logger.info(
    { jobId: job.id, type, to: payload.to },
    'Email job enqueued'
  );

  return job;
}

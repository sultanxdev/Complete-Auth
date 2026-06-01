/**
 * Redis connection shared across the server and queue producer.
 *
 * BullMQ requires maxRetriesPerRequest: null for the connection
 * used by workers/queues — this is a known BullMQ requirement.
 */

import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

let redisClient = null;

/**
 * Get the singleton Redis client instance.
 * Creates the connection on first call.
 *
 * @returns {Redis}
 */
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    logger.info({ url: config.REDIS_URL }, 'Redis connected');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redisClient;
}

/**
 * Gracefully close the Redis connection.
 * Call this during server shutdown.
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed gracefully');
  }
}

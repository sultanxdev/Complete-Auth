/**
 * requireAuth middleware — protects routes requiring an active session.
 *
 * Attaches session + user to req.session and req.user.
 * Blocks banned users automatically.
 */

import { auth } from '../auth.js';
import { logger } from '../logger.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
          status: 401,
        },
      });
    }

    // Block banned users from all authenticated endpoints
    if (session.user.banned) {
      logger.warn({ userId: session.user.id }, 'Banned user attempted access');

      return res.status(403).json({
        error: {
          code: 'ACCOUNT_BANNED',
          message: session.user.banReason
            ? `Your account has been suspended: ${session.user.banReason}`
            : 'Your account has been suspended.',
          status: 403,
        },
      });
    }

    req.session = session.session;
    req.user = session.user;
    next();
  } catch (err) {
    logger.error({ err }, 'requireAuth error');
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', status: 500 },
    });
  }
}

/**
 * requireRole middleware — enforces minimum role level on routes.
 *
 * Role hierarchy (ascending):
 *   guest (0) < user (1) < moderator (2) < admin (3)
 *
 * Usage:
 *   router.get('/admin/users', requireAuth, requireRole('admin'), handler)
 *   router.get('/reports',     requireAuth, requireRole('moderator'), handler)
 *
 * Must be used AFTER requireAuth (needs req.user to be set).
 */

const ROLE_LEVELS = {
  guest: 0,
  user: 1,
  moderator: 2,
  admin: 3,
};

/**
 * Factory that returns an Express middleware enforcing a minimum role.
 *
 * @param {'guest' | 'user' | 'moderator' | 'admin'} minimumRole
 * @returns {import('express').RequestHandler}
 */
export function requireRole(minimumRole) {
  const requiredLevel = ROLE_LEVELS[minimumRole];

  if (requiredLevel === undefined) {
    throw new Error(`requireRole: Unknown role "${minimumRole}"`);
  }

  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.', status: 401 },
      });
    }

    const userLevel = ROLE_LEVELS[user.role] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires the "${minimumRole}" role or higher.`,
          status: 403,
        },
      });
    }

    next();
  };
}

/**
 * Check if a role meets the minimum requirement (useful in service layer).
 *
 * @param {string} userRole
 * @param {string} minimumRole
 * @returns {boolean}
 */
export function hasRole(userRole, minimumRole) {
  return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[minimumRole] ?? 0);
}

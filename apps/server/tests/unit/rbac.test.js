/**
 * Unit tests — RBAC middleware
 *
 * Tests the role level comparison logic and middleware behavior
 * without requiring a database or HTTP server.
 */

import { describe, it, expect, vi } from 'vitest';
import { requireRole, hasRole } from '../../src/middleware/require-role.js';

describe('hasRole utility', () => {
  it('returns true when userRole equals minimumRole', () => {
    expect(hasRole('admin', 'admin')).toBe(true);
    expect(hasRole('user', 'user')).toBe(true);
    expect(hasRole('guest', 'guest')).toBe(true);
  });

  it('returns true when userRole is higher than minimumRole', () => {
    expect(hasRole('admin', 'moderator')).toBe(true);
    expect(hasRole('admin', 'user')).toBe(true);
    expect(hasRole('admin', 'guest')).toBe(true);
    expect(hasRole('moderator', 'user')).toBe(true);
    expect(hasRole('moderator', 'guest')).toBe(true);
    expect(hasRole('user', 'guest')).toBe(true);
  });

  it('returns false when userRole is lower than minimumRole', () => {
    expect(hasRole('guest', 'user')).toBe(false);
    expect(hasRole('guest', 'moderator')).toBe(false);
    expect(hasRole('guest', 'admin')).toBe(false);
    expect(hasRole('user', 'moderator')).toBe(false);
    expect(hasRole('user', 'admin')).toBe(false);
    expect(hasRole('moderator', 'admin')).toBe(false);
  });

  it('handles unknown roles gracefully (treats as guest level 0)', () => {
    expect(hasRole('superuser', 'admin')).toBe(false);
    expect(hasRole('superuser', 'guest')).toBe(true); // 0 >= 0
  });
});

describe('requireRole middleware factory', () => {
  it('throws for unknown role argument', () => {
    expect(() => requireRole('overlord')).toThrow('Unknown role "overlord"');
  });

  it('returns 401 when req.user is not set', () => {
    const middleware = requireRole('user');
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user has sufficient role', () => {
    const middleware = requireRole('user');
    const req = { user: { role: 'user' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is insufficient', () => {
    const middleware = requireRole('admin');
    const req = { user: { role: 'user' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin to access any route', () => {
    const req = { user: { role: 'admin' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    for (const role of ['guest', 'user', 'moderator', 'admin']) {
      const mw = requireRole(role);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
    }
  });
});

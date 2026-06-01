'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserX, UserCheck, Shield, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useSession } from '../../../lib/auth-client';

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isPending && !session) { router.push('/login'); return; }
    if (!isPending && session?.user?.role !== 'admin') { router.push('/dashboard'); }
  }, [session, isPending, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) { params.set('search', search); }
      if (roleFilter) { params.set('role', roleFilter); }
      if (bannedFilter) { params.set('banned', bannedFilter); }

      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      const json = await res.json();
      setUsers(json.data ?? []);
      setMeta(json.meta ?? { total: 0, page: 1, pages: 1 });
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, bannedFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBanToggle(user) {
    const endpoint = user.banned ? 'unban' : 'ban';
    try {
      const res = await fetch(`/api/admin/users/${user.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(user.banned ? {} : { reason: 'Banned by admin' }),
      });
      if (res.ok) {
        showToast(`User ${user.banned ? 'unbanned' : 'banned'} successfully`);
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error?.message ?? 'Action failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast('Role updated successfully');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error?.message ?? 'Failed to update role', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  }

  async function handleForceLogout(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/force-logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) { showToast('User signed out from all sessions'); }
    } catch {
      showToast('Network error', 'error');
    }
  }

  if (isPending || !session) { return null; }

  return (
    <div className="dashboard-layout">
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{toast.message}</span>
          </div>
        </div>
      )}

      <aside className="dashboard-sidebar">
        <div className="auth-logo" style={{ justifyContent: 'flex-start', marginBottom: 32 }}>
          <div className="auth-logo-icon" style={{ width: 36, height: 36 }}>🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>
        <nav>
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/settings', label: 'Settings' },
            { href: '/admin/users', label: 'Admin Users', active: true },
          ].map(({ href, label, active }) => (
            <a key={href} href={href} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>User Management</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
              {meta.total} total users
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="form-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
            <Search className="form-input-icon" size={16} />
            <input
              type="search"
              placeholder="Search by name or email…"
              className="form-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
            <option value="guest">Guest</option>
          </select>
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={bannedFilter}
            onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No users found</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: 'white',
                          }}>
                            {user.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === session.user.id}
                        >
                          <option value="guest">Guest</option>
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        {user.banned
                          ? <span className="badge badge-banned">Banned</span>
                          : user.emailVerified
                            ? <span className="badge badge-active">Active</span>
                            : <span className="badge badge-guest">Unverified</span>
                        }
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: user.banned ? 'var(--color-text-success)' : 'var(--color-text-error)', padding: '6px 10px' }}
                            onClick={() => handleBanToggle(user)}
                            disabled={user.id === session.user.id}
                            title={user.banned ? 'Unban user' : 'Ban user'}
                          >
                            {user.banned ? <UserCheck size={14} /> : <UserX size={14} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px 10px' }}
                            onClick={() => handleForceLogout(user.id)}
                            disabled={user.id === session.user.id}
                            title="Force sign out all sessions"
                          >
                            <Shield size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="pagination" style={{ padding: '16px 0', borderTop: '1px solid var(--color-border)' }}>
              <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: meta.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 2)
                .map((p, i, arr) => (
                  <>
                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>…</span>}
                    <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  </>
                ))
              }
              <button className="pagination-btn" onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

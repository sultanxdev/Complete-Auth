'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Settings, Users, LogOut, Key, Activity, ChevronRight } from 'lucide-react';
import { authClient, useSession } from '../../lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/login') } });
  };

  if (isPending) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="btn-loading-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!session) { return null; }

  const user = session.user;

  const stats = [
    { label: 'Account Status', value: user.emailVerified ? 'Verified ✓' : 'Unverified', color: user.emailVerified ? 'var(--color-text-success)' : 'var(--color-text-warning)' },
    { label: 'Role', value: user.role ?? 'user', color: 'var(--color-accent-1)' },
    { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), color: 'var(--color-text-secondary)' },
  ];

  const quickLinks = [
    { href: '/settings', label: 'Account Settings', icon: Settings, desc: 'Profile, password, 2FA' },
    { href: '/settings/sessions', label: 'Active Sessions', icon: Activity, desc: 'View and revoke sessions' },
    { href: '/settings/security', label: 'Security', icon: Shield, desc: 'Two-factor authentication' },
    ...(user.role === 'admin' ? [{ href: '/admin/users', label: 'Admin Panel', icon: Users, desc: 'Manage users and roles' }] : []),
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="auth-logo" style={{ justifyContent: 'flex-start', marginBottom: 32 }}>
          <div className="auth-logo-icon" style={{ width: 36, height: 36 }}>🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <nav>
          {[
            { href: '/dashboard', label: 'Dashboard', icon: Activity },
            { href: '/settings', label: 'Settings', icon: Settings },
            { href: '/settings/security', label: 'Security', icon: Shield },
            ...(user.role === 'admin' ? [{ href: '/admin/users', label: 'Admin', icon: Users }] : []),
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="sidebar-nav-item">
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0
            }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
            </div>
          </div>
          <button className="sidebar-nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-error)' }} onClick={handleSignOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ position: 'relative', zIndex: 1 }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Welcome back, <span className="text-gradient">{user.name?.split(' ')[0] ?? 'User'}</span> 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
            Here&apos;s an overview of your account.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{stat.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: stat.color, textTransform: 'capitalize' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {quickLinks.map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{
                padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s ease', cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(102,126,234,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: 'rgba(102, 126, 234, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color="var(--color-accent-1)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
            </Link>
          ))}
        </div>

        {/* Email verification notice */}
        {!user.emailVerified && (
          <div className="alert alert-warning" style={{ marginTop: 24 }}>
            <Key size={16} style={{ flexShrink: 0 }} />
            <span>
              Your email is not verified. Some features may be limited.{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-warning)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => authClient.sendVerificationEmail({ email: user.email, callbackURL: '/dashboard' })}
              >
                Resend verification email
              </button>
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Settings, Users, LogOut, Key,
  Activity, ChevronRight, CheckCircle2, Clock, UserCircle2,
} from 'lucide-react';
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid rgba(102,126,234,0.2)',
          borderTopColor: 'var(--color-accent-1)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    );
  }

  if (!session) { return null; }

  const user = session.user;

  const stats = [
    {
      label: 'Account Status',
      value: user.emailVerified ? 'Verified' : 'Unverified',
      color: user.emailVerified ? 'var(--color-text-success)' : 'var(--color-text-warning)',
      icon: <CheckCircle2 size={20} color={user.emailVerified ? 'var(--color-text-success)' : 'var(--color-text-warning)'} />,
      iconBg: user.emailVerified ? 'rgba(34, 197, 94, 0.12)' : 'rgba(251, 191, 36, 0.12)',
      iconBorder: user.emailVerified ? 'rgba(34, 197, 94, 0.25)' : 'rgba(251, 191, 36, 0.25)',
    },
    {
      label: 'Role',
      value: user.role ?? 'User',
      color: 'var(--color-accent-1)',
      icon: <Shield size={20} color="var(--color-accent-1)" />,
      iconBg: 'rgba(124, 142, 240, 0.12)',
      iconBorder: 'rgba(124, 142, 240, 0.25)',
    },
    {
      label: 'Member Since',
      value: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      color: 'var(--color-text-secondary)',
      icon: <Clock size={20} color="var(--color-text-secondary)" />,
      iconBg: 'rgba(139, 156, 200, 0.1)',
      iconBorder: 'rgba(139, 156, 200, 0.2)',
    },
  ];

  const quickLinks = [
    { href: '/settings', label: 'Account Settings', icon: Settings, desc: 'Manage your profile & preferences' },
    { href: '/settings#sessions', label: 'Active Sessions', icon: Activity, desc: 'View and revoke active sessions' },
    { href: '/settings#2fa', label: 'Security & 2FA', icon: Shield, desc: 'Two-factor authentication setup' },
    ...(user.role === 'admin' ? [{ href: '/admin/users', label: 'Admin Panel', icon: Users, desc: 'Manage users and roles' }] : []),
  ];

  const sidebarLinks = [
    { href: '/dashboard', label: 'Overview', icon: Activity },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/settings#2fa', label: 'Security', icon: Shield },
    ...(user.role === 'admin' ? [{ href: '/admin/users', label: 'Admin', icon: Users }] : []),
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        {/* Logo */}
        <div className="auth-logo" style={{ justifyContent: 'flex-start', marginBottom: 36 }}>
          <div className="auth-logo-icon" style={{ width: 38, height: 38, fontSize: 18 }}>🔐</div>
          <span className="auth-logo-text" style={{ fontSize: 18 }}>CompleteAuth</span>
        </div>

        {/* Nav label */}
        <p style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0 13px',
          marginBottom: 8,
        }}>
          Navigation
        </p>

        <nav style={{ flex: 1 }}>
          {sidebarLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="sidebar-nav-item"
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Separator */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)',
          margin: '16px 0',
        }} />

        {/* User profile section */}
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
              boxShadow: 'var(--shadow-glow-sm)',
            }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.name}
              </p>
              <p style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <button
          className="sidebar-nav-item"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-error)',
            justifyContent: 'flex-start',
          }}
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ position: 'relative', zIndex: 1 }}>
        {/* Welcome header */}
        <div style={{ marginBottom: 36 }}>
          {/* Subtle hero gradient chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: 'var(--radius-full)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              animation: 'logo-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--color-accent-1)', fontWeight: 600 }}>
              Active Session
            </span>
          </div>

          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}>
            Welcome back,{' '}
            <span className="text-gradient">{user.name?.split(' ')[0] ?? 'User'}</span> 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 15 }}>
            Here&apos;s an overview of your account.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}>
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div
                className="stat-card-icon"
                style={{
                  background: stat.iconBg,
                  border: `1px solid ${stat.iconBorder}`,
                }}
              >
                {stat.icon}
              </div>
              <p className="stat-card-label">{stat.label}</p>
              <p className="stat-card-value" style={{ color: stat.color, textTransform: 'capitalize' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Quick Actions
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {quickLinks.length} items
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {quickLinks.map(({ href, label, icon: Icon, desc }) => (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div className="action-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
                    <div className="action-card-icon">
                      <Icon size={18} color="var(--color-accent-1)" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{desc}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    color="var(--color-text-muted)"
                    style={{ flexShrink: 0, position: 'relative', zIndex: 1, transition: 'transform 200ms', transform: 'translateX(0)' }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Email verification notice */}
        {!user.emailVerified && (
          <div className="alert alert-warning" style={{ marginTop: 24 }}>
            <Key size={16} style={{ flexShrink: 0 }} />
            <span>
              Your email is not verified. Some features may be limited.{' '}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-warning)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 'inherit',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
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

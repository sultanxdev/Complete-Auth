'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, ArrowLeft, Zap } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export default function MagicLinkPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: '/dashboard',
      });
      // Always show success (prevents user enumeration)
      setSent(true);
    } catch {
      setSent(true); // Enumerate-safe
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="auth-layout">
        <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 24px'
          }}>✨</div>

          <h1 className="auth-heading">Magic link sent!</h1>
          <p className="auth-subheading">
            Check your inbox at <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>.
            The link expires in <strong>15 minutes</strong>.
          </p>

          <div className="alert alert-info" style={{ marginTop: 24, textAlign: 'left' }}>
            <Zap size={16} style={{ flexShrink: 0 }} />
            <span>Click the link in your email to sign in instantly — no password needed.</span>
          </div>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => setSent(false)}
          >
            Try a different email
          </button>

          <div className="auth-footer-link">
            <Link href="/login"><ArrowLeft size={14} style={{ marginRight: 4 }} />Back to sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <div className="glass-card auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✨</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Sign in with magic link</h1>
        <p className="auth-subheading">
          Enter your email and we&apos;ll send you a one-click sign-in link. No password needed.
        </p>

        {/* Feature badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          {['No password', 'Instant access', 'Secure token'].map((label) => (
            <span key={label} style={{
              padding: '4px 12px',
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.25)',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              color: 'var(--color-accent-1)',
              fontWeight: 500,
            }}>{label}</span>
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="magic-email">Email Address</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" />
              <input
                id="magic-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            id="magic-link-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !email}
          >
            {loading ? (
              <><span className="btn-loading-spinner" /> Sending…</>
            ) : (
              <><Zap size={16} /> Send Magic Link</>
            )}
          </button>
        </form>

        <div className="auth-footer-link">
          <Link href="/login"><ArrowLeft size={14} style={{ marginRight: 4 }} />Sign in with password</Link>
        </div>
      </div>
    </main>
  );
}

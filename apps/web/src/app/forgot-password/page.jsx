'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`,
      });
      // Always show success (prevents user enumeration)
      setSent(true);
    } catch {
      setSent(true); // Still show success to prevent enumeration
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="auth-layout">
        <div className="glass-card auth-card" style={{ textAlign: 'center', padding: '52px 40px' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(102,126,234,0.18), rgba(176,110,245,0.12))',
            border: '1px solid rgba(102,126,234,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'logo-pulse 3s ease-in-out infinite',
          }}>
            <Send size={34} color="var(--color-accent-1)" />
          </div>
          <h1 className="auth-heading">Check your email</h1>
          <p className="auth-subheading">
            If an account exists for{' '}
            <strong style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{email}</strong>,
            you&apos;ll receive a password reset link shortly.
          </p>

          <div style={{
            padding: '14px 16px',
            background: 'rgba(102,126,234,0.06)',
            border: '1px solid rgba(102,126,234,0.15)',
            borderRadius: 'var(--radius-lg)',
            marginTop: 8,
            marginBottom: 28,
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}>
            The link expires in <strong style={{ color: 'var(--color-text-secondary)' }}>1 hour</strong>.
          </div>

          <Link href="/login" className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <div className="glass-card glass-card-shimmer auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Forgot password?</h1>
        <p className="auth-subheading">
          Enter your email address and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Email</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" />
              <input
                id="forgot-email"
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
            id="forgot-password-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !email}
            style={{ gap: 10 }}
          >
            {loading ? (
              <>
                <span className="btn-loading-spinner" />
                Sending…
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-link">
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

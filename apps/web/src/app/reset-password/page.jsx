'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  { score++; }
  if (password.length >= 12) { score++; }
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) { score++; }
  if (/[0-9]/.test(password)) { score++; }
  return Math.min(4, score);
}

const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (authError) {
        setError(authError.message ?? 'Failed to reset password. The link may have expired.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
        <h1 className="auth-heading">Invalid Link</h1>
        <p className="auth-subheading">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="btn btn-primary" style={{ marginTop: 24 }}>
          Request new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
        <h1 className="auth-heading">Password reset!</h1>
        <p className="auth-subheading">
          Your password has been changed. Redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card auth-card">
      <div className="auth-logo">
        <div className="auth-logo-icon">🔐</div>
        <span className="auth-logo-text">CompleteAuth</span>
      </div>

      <h1 className="auth-heading">Set new password</h1>
      <p className="auth-subheading">Choose a strong password for your account.</p>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="new-password">New Password</label>
          <div className="form-input-wrapper">
            <Lock className="form-input-icon" />
            <input
              id="new-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="Min. 8 characters"
              className="form-input"
              style={{ paddingRight: 44 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="form-input-action" onClick={() => setShowPwd((v) => !v)}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && (
            <div className="password-strength" style={{ marginTop: 8 }}>
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className="password-strength-bar"
                  style={{ background: bar <= strength ? strengthColors[strength] : undefined }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
          <div className="form-input-wrapper">
            <Lock className="form-input-icon" />
            <input
              id="confirm-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="Re-enter your password"
              className={`form-input ${confirm && confirm !== password ? 'error' : ''}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>
          {confirm && confirm !== password && (
            <p className="form-error"><AlertCircle size={13} /> Passwords do not match</p>
          )}
          {confirm && confirm === password && password && (
            <p style={{ fontSize: 13, color: 'var(--color-text-success)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <CheckCircle size={13} /> Passwords match
            </p>
          )}
        </div>

        <button
          id="reset-password-submit"
          type="submit"
          className="btn btn-primary"
          disabled={loading || !password || !confirm}
        >
          {loading ? (
            <><span className="btn-loading-spinner" /> Resetting…</>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="auth-layout">
      <Suspense fallback={
        <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
          <div className="btn-loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

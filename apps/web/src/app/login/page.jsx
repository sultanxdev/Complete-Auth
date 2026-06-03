'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import OAuthButtons from '../../components/OAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) { setError(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: form.email,
        password: form.password,
        rememberMe,
        fetchOptions: {
          onError: (ctx) => {
            setError(ctx.error.message ?? 'Invalid email or password.');
          },
        },
      });

      if (authError) {
        setError(authError.message ?? 'Sign in failed. Please try again.');
        return;
      }

      // Check if 2FA is required
      if (data?.twoFactorRedirect) {
        router.push('/2fa');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.email.length > 0 && form.password.length > 0;

  return (
    <main className="auth-layout">
      <div className="glass-card glass-card-shimmer auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Sign in to continue to your account</p>

        {/* OAuth Buttons */}
        <OAuthButtons mode="signin" />

        {/* Divider */}
        <div className="oauth-divider">
          <div className="oauth-divider-line" />
          <span className="oauth-divider-text">or continue with email</span>
          <div className="oauth-divider-line" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="form-input"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: 12,
                  color: 'var(--color-accent-1)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  transition: 'color 150ms',
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="form-input-wrapper">
              <Lock className="form-input-icon" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="form-input"
                style={{ paddingRight: 44 }}
                value={form.password}
                onChange={handleChange}
                disabled={loading}
              />
              <button
                type="button"
                className="form-input-action"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div
              style={{
                position: 'relative',
                width: 18,
                height: 18,
                flexShrink: 0,
              }}
            >
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: 'var(--color-accent-1)',
                  cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                }}
              />
            </div>
            <label htmlFor="remember-me" style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              Stay signed in for 30 days
            </label>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !isValid}
            style={{ gap: 10 }}
          >
            {loading ? (
              <>
                <span className="btn-loading-spinner" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Magic Link */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link
            href="/magic-link"
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <Sparkles size={13} />
            Sign in without a password
          </Link>
        </div>

        <div className="divider" style={{ margin: '20px 0' }} />

        <div className="auth-footer-link">
          Don&apos;t have an account?{' '}
          <Link href="/register">Create account</Link>
        </div>
      </div>
    </main>
  );
}

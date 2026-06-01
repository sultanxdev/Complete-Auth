'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import OAuthButtons from '../../components/OAuthButtons';

export const metadata = {
  title: 'Sign In',
};

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

  return (
    <main className="auth-layout">
      <div className="glass-card auth-card" style={{ animation: 'fade-up 0.5s ease' }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Sign in to your account to continue</p>

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
            <label className="form-label" htmlFor="login-email">Email</label>
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
              <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--color-accent-1)', textDecoration: 'none' }}>
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
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent-1)', cursor: 'pointer' }}
            />
            <label htmlFor="remember-me" style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Remember me for 30 days
            </label>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? (
              <>
                <span className="btn-loading-spinner" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Magic Link link */}
        <div className="auth-footer-link" style={{ marginTop: 16 }}>
          <Link href="/magic-link" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 13 }}>
            Sign in without a password →
          </Link>
        </div>

        <div className="auth-footer-link">
          Don&apos;t have an account? <Link href="/register">Create account</Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

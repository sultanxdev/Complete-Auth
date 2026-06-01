'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import OAuthButtons from '../../components/OAuthButtons';

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  { score++; }
  if (password.length >= 12) { score++; }
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) { score++; }
  if (/[0-9]/.test(password)) { score++; }
  if (/[^A-Za-z0-9]/.test(password)) { score++; }
  return Math.min(4, score);
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(form.password);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) { setError(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.signUp.email({
        name: form.name,
        email: form.email,
        password: form.password,
        fetchOptions: {
          onError: (ctx) => {
            setError(ctx.error.message ?? 'Registration failed.');
          },
        },
      });

      if (authError) {
        setError(authError.message ?? 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="auth-layout">
        <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📧</div>
          <h1 className="auth-heading">Check your inbox</h1>
          <p className="auth-subheading" style={{ marginBottom: 0 }}>
            We sent a verification link to <strong style={{ color: 'var(--color-text-primary)' }}>{form.email}</strong>.
            Click it to activate your account.
          </p>
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-accent-1)', cursor: 'pointer', fontSize: 13 }}
                onClick={() => setSuccess(false)}
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <div className="glass-card auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Create an account</h1>
        <p className="auth-subheading">Start your journey with CompleteAuth</p>

        <OAuthButtons mode="signup" />

        <div className="oauth-divider">
          <div className="oauth-divider-line" />
          <span className="oauth-divider-text">or register with email</span>
          <div className="oauth-divider-line" />
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" />
              <input
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="John Doe"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" />
              <input
                id="reg-email"
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
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="form-input-wrapper">
              <Lock className="form-input-icon" />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Min. 8 characters"
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

            {/* Password strength bars */}
            {form.password && (
              <>
                <div className="password-strength">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className="password-strength-bar"
                      style={{ background: bar <= strength ? strengthColors[strength] : undefined }}
                    />
                  ))}
                </div>
                <p className="form-hint">
                  Strength:{' '}
                  <span style={{ color: strengthColors[strength], fontWeight: 600 }}>
                    {strengthLabels[strength]}
                  </span>
                </p>
              </>
            )}
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !form.name || !form.email || !form.password}
          >
            {loading ? (
              <>
                <span className="btn-loading-spinner" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 16 }}>
          By signing up, you agree to our{' '}
          <a href="#" style={{ color: 'var(--color-accent-1)' }}>Terms of Service</a>{' '}
          and{' '}
          <a href="#" style={{ color: 'var(--color-accent-1)' }}>Privacy Policy</a>.
        </p>

        <div className="auth-footer-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </main>
  );
}

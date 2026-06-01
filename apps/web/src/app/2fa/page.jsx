'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5 && newCode.every((d) => d)) {
      submitCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  async function submitCode(totpCode) {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await authClient.twoFactor.verifyTotp({ code: totpCode });

      if (authError) {
        setError(authError.message ?? 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleBackupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await authClient.twoFactor.verifyBackupCode({
        code: backupCode.trim(),
      });

      if (authError) {
        setError(authError.message ?? 'Invalid backup code.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <div className="glass-card auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>

        <h1 className="auth-heading">Two-factor authentication</h1>
        <p className="auth-subheading">
          {useBackup
            ? 'Enter one of your 10-digit backup codes.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!useBackup ? (
          <>
            {/* OTP digit grid */}
            <div className="otp-grid" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                <span className="btn-loading-spinner" style={{ display: 'inline-block', margin: '0 auto 8px' }} />
                <br />
                Verifying…
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 8 }}
              disabled={loading}
              onClick={() => {
                const fullCode = code.join('');
                if (fullCode.length === 6) {
                  submitCode(fullCode);
                }
              }}
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
          </>
        ) : (
          <form onSubmit={handleBackupSubmit} style={{ marginTop: 8 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="backup-code">Backup Code</label>
              <input
                id="backup-code"
                type="text"
                placeholder="xxxxxxxxxx"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textAlign: 'center' }}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <p className="form-hint">Each backup code can only be used once.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !backupCode.trim()}>
              {loading ? <><span className="btn-loading-spinner" /> Verifying…</> : 'Use Backup Code'}
            </button>
          </form>
        )}

        <div className="divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setUseBackup((v) => !v); setError(''); }}
          >
            <Shield size={14} />
            {useBackup ? 'Use authenticator app' : 'Use backup code instead'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push('/login')}
          >
            <ArrowLeft size={14} />
            Back to sign in
          </button>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token found in the URL.');
      return;
    }

    authClient.verifyEmail({ query: { token } })
      .then(({ error: authError }) => {
        if (authError) {
          setStatus('error');
          setError(authError.message ?? 'Verification failed. The link may have expired.');
        } else {
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      })
      .catch(() => {
        setStatus('error');
        setError('An unexpected error occurred during verification.');
      });
  }, [token, router]);

  if (status === 'verifying') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="btn-loading-spinner" style={{ width: 48, height: 48, margin: '0 auto 24px', borderWidth: 3 }} />
        <h1 className="auth-heading">Verifying your email…</h1>
        <p className="auth-subheading">Please wait a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h1 className="auth-heading">Email verified!</h1>
        <p className="auth-subheading">Your account is now active. Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>❌</div>
      <h1 className="auth-heading">Verification failed</h1>
      <div className="alert alert-error" style={{ textAlign: 'left', marginBottom: 24 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>{error}</span>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
        Verification links expire after 24 hours.
      </p>
      <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="auth-layout">
      <div className="glass-card auth-card">
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="auth-logo-icon">🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>
        <Suspense fallback={
          <div style={{ textAlign: 'center' }}>
            <div className="btn-loading-spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  );
}

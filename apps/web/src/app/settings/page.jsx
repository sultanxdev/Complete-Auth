'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Shield, Monitor, Trash2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authClient, useSession } from '../../../lib/auth-client';

function SessionCard({ session, currentSessionId, onRevoke }) {
  const isCurrentSession = session.id === currentSessionId;
  const ua = session.userAgent ?? 'Unknown device';
  const deviceIcon = ua.toLowerCase().includes('mobile') ? '📱' : '🖥️';

  return (
    <div className={`session-card ${isCurrentSession ? 'current' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>{deviceIcon}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {ua.substring(0, 60)}
            {isCurrentSession && <span className="badge badge-active" style={{ marginLeft: 8 }}>Current</span>}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {session.ipAddress ?? 'IP unknown'} · Expires {new Date(session.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {!isCurrentSession && (
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-error)' }} onClick={() => onRevoke(session.id)}>
          Revoke
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [tab, setTab] = useState('profile');
  const [sessions, setSessions] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Profile form
  const [name, setName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // 2FA
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaSetup, setTfaSetup] = useState(null); // { qrCode, secret, backupCodes }
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session) { router.push('/login'); }
    if (session) {
      setName(session.user.name ?? '');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (tab === 'sessions') { loadSessions(); }
  }, [tab]);

  const toast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const loadSessions = async () => {
    const { data } = await authClient.listSessions();
    setSessions(data ?? []);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const { error } = await authClient.updateUser({ name });
    setProfileLoading(false);
    if (error) { toast(error.message ?? 'Update failed', 'error'); }
    else { toast('Profile updated successfully!'); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPwd !== passwordForm.confirm) {
      toast('Passwords do not match', 'error'); return;
    }
    if (passwordForm.newPwd.length < 8) {
      toast('Password must be at least 8 characters', 'error'); return;
    }
    setPwdLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.newPwd,
      revokeOtherSessions: true,
    });
    setPwdLoading(false);
    if (error) { toast(error.message ?? 'Password change failed', 'error'); }
    else {
      toast('Password changed! All other sessions have been signed out.');
      setPasswordForm({ current: '', newPwd: '', confirm: '' });
    }
  };

  const handleEnable2FA = async () => {
    setTfaLoading(true);
    const { data, error } = await authClient.twoFactor.enable({ password: passwordForm.current || '' });
    setTfaLoading(false);
    if (error) { toast(error.message ?? '2FA enable failed', 'error'); return; }
    setTfaSetup(data);
  };

  const handleVerify2FA = async () => {
    setTfaLoading(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: tfaCode });
    setTfaLoading(false);
    if (error) { toast(error.message ?? 'Invalid code', 'error'); return; }
    setTfaEnabled(true);
    setTfaSetup(null);
    toast('Two-factor authentication enabled!');
  };

  const handleDisable2FA = async () => {
    setTfaLoading(true);
    const { error } = await authClient.twoFactor.disable({ password: '' });
    setTfaLoading(false);
    if (error) { toast(error.message ?? 'Failed to disable 2FA', 'error'); return; }
    setTfaEnabled(false);
    toast('Two-factor authentication disabled.');
  };

  const handleRevokeSession = async (sessionId) => {
    await authClient.revokeSession({ sessionToken: sessionId });
    toast('Session revoked');
    loadSessions();
  };

  const handleRevokeAllSessions = async () => {
    await authClient.revokeOtherSessions();
    toast('All other sessions revoked');
    loadSessions();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: '2fa', label: 'Two-Factor', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
  ];

  if (isPending || !session) { return null; }

  const user = session.user;

  return (
    <div className="dashboard-layout">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <CheckCircle size={16} color="#22c55e" /> : <AlertCircle size={16} color="#ef4444" />}
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{t.message}</span>
          </div>
        ))}
      </div>

      <aside className="dashboard-sidebar">
        <div className="auth-logo" style={{ justifyContent: 'flex-start', marginBottom: 32 }}>
          <div className="auth-logo-icon" style={{ width: 36, height: 36 }}>🔐</div>
          <span className="auth-logo-text">CompleteAuth</span>
        </div>
        <nav>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-nav-item ${tab === id ? 'active' : ''}`}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main" style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 24 }}>Account Settings</h1>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="glass-card glass-card-shimmer" style={{ padding: 32, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--color-text-primary)' }}>Profile Information</h2>
            <form onSubmit={handleProfileSave}>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, color: 'white',
                }}>
                  {name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 600 }}>{user.email}</p>
                  <span className={`badge badge-${user.role ?? 'user'}`}>{user.role ?? 'user'}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-name">Display Name</label>
                <input
                  id="settings-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={profileLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={user.email} disabled />
                <p className="form-hint">Email changes require verification. Contact support to change your email.</p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={profileLoading || !name.trim()}>
                {profileLoading ? <><span className="btn-loading-spinner" /> Saving…</> : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="glass-card glass-card-shimmer" style={{ padding: 32, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--color-text-primary)' }}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              {['current', 'newPwd', 'confirm'].map((field) => (
                <div className="form-group" key={field}>
                  <label className="form-label" htmlFor={`pwd-${field}`}>
                    {field === 'current' ? 'Current Password' : field === 'newPwd' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <div className="form-input-wrapper">
                    <Lock className="form-input-icon" />
                    <input
                      id={`pwd-${field}`}
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingRight: 44 }}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      disabled={pwdLoading}
                      autoComplete={field === 'current' ? 'current-password' : 'new-password'}
                    />
                    {field === 'confirm' && (
                      <button type="button" className="form-input-action" onClick={() => setShowPwd((v) => !v)}>
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <p className="form-hint" style={{ marginBottom: 20 }}>⚠️ Changing your password will sign out all other active sessions.</p>
              <button type="submit" className="btn btn-primary" disabled={pwdLoading || !passwordForm.current || !passwordForm.newPwd || !passwordForm.confirm}>
                {pwdLoading ? <><span className="btn-loading-spinner" /> Changing…</> : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* 2FA Tab */}
        {tab === '2fa' && (
          <div className="glass-card glass-card-shimmer" style={{ padding: 32, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>Two-Factor Authentication</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
              Add an extra layer of security by requiring a verification code when signing in.
            </p>

            {!tfaSetup && !tfaEnabled && (
              <button className="btn btn-primary" onClick={handleEnable2FA} disabled={tfaLoading}>
                {tfaLoading ? <><span className="btn-loading-spinner" /> Setting up…</> : <><Shield size={16} /> Enable Two-Factor Auth</>}
              </button>
            )}

            {tfaSetup && (
              <div>
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <Shield size={16} style={{ flexShrink: 0 }} />
                  <span>Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code to confirm.</span>
                </div>
                {tfaSetup.qrCode && (
                  <div className="qr-container" style={{ marginBottom: 20 }}>
                    <img src={tfaSetup.qrCode} alt="2FA QR Code" width={200} height={200} />
                  </div>
                )}
                {tfaSetup.secret && (
                  <div style={{ marginBottom: 20 }}>
                    <p className="form-hint">Can&apos;t scan? Enter manually:</p>
                    <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 12px', background: 'var(--color-bg-input)', borderRadius: 'var(--radius-md)', marginTop: 6, wordBreak: 'break-all', color: 'var(--color-accent-3)' }}>
                      {tfaSetup.secret}
                    </code>
                  </div>
                )}
                {tfaSetup.backupCodes && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-warning)', marginBottom: 8 }}>⚠️ Save these backup codes — shown only once!</p>
                    <div className="backup-codes-grid">
                      {tfaSetup.backupCodes.map((code, i) => (
                        <span key={i} className="backup-code">{code}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="tfa-confirm">Confirm Code</label>
                  <input
                    id="tfa-confirm"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textAlign: 'center', fontSize: 20 }}
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleVerify2FA} disabled={tfaLoading || tfaCode.length !== 6}>
                  {tfaLoading ? <><span className="btn-loading-spinner" /> Verifying…</> : 'Activate 2FA'}
                </button>
              </div>
            )}

            {tfaEnabled && (
              <div>
                <div className="alert alert-success" style={{ marginBottom: 20 }}>
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Two-factor authentication is <strong>enabled</strong>. Your account is more secure.</span>
                </div>
                <button className="btn btn-danger" onClick={handleDisable2FA} disabled={tfaLoading}>
                  {tfaLoading ? <><span className="btn-loading-spinner" /> Disabling…</> : 'Disable 2FA'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Active Sessions</h2>
              {sessions.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-error)' }} onClick={handleRevokeAllSessions}>
                  <Trash2 size={14} />
                  Revoke all others
                </button>
              )}
            </div>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No active sessions found.</p>
            ) : (
              sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  currentSessionId={session.session.id}
                  onRevoke={handleRevokeSession}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

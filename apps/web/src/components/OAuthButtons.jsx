'use client';

import { useState } from 'react';
import { authClient } from '../lib/auth-client';

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GITHUB_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const PROVIDERS = [
  { id: 'google', label: 'Google', icon: GOOGLE_ICON },
  { id: 'github', label: 'GitHub', icon: GITHUB_ICON },
];

/**
 * OAuth sign-in / sign-up buttons.
 *
 * @param {{ mode: 'signin' | 'signup' }} props
 */
export default function OAuthButtons({ mode = 'signin' }) {
  const [loading, setLoading] = useState(null);

  const handleOAuth = async (providerId) => {
    setLoading(providerId);
    try {
      await authClient.signIn.social({
        provider: providerId,
        callbackURL: '/dashboard',
      });
    } catch (err) {
      console.error(`OAuth error (${providerId}):`, err);
      setLoading(null);
    }
  };

  const actionLabel = mode === 'signup' ? 'Sign up with' : 'Sign in with';

  return (
    <div className="oauth-grid">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          id={`oauth-${provider.id}`}
          type="button"
          className="oauth-btn"
          onClick={() => handleOAuth(provider.id)}
          disabled={loading !== null}
          aria-label={`${actionLabel} ${provider.label}`}
          title={`${actionLabel} ${provider.label}`}
        >
          {loading === provider.id ? (
            <span
              className="btn-loading-spinner"
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
                borderTopColor: 'var(--color-accent-1)',
              }}
            />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, width: 18, height: 18 }}>
              {provider.icon}
            </span>
          )}
          <span style={{ fontWeight: 500 }}>{provider.label}</span>
        </button>
      ))}
    </div>
  );
}

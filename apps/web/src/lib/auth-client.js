/**
 * Better Auth browser client.
 *
 * Initialized once and exported as a singleton.
 * Includes all client plugins matching the server configuration.
 */

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { magicLinkClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  plugins: [
    twoFactorClient({
      twoFactorPage: '/2fa', // Redirect here when 2FA is required after login
    }),
    magicLinkClient(),
    adminClient(),
  ],
});

// Re-export commonly used methods for cleaner imports
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

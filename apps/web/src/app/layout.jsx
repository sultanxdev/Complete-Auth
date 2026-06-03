import './globals.css';

export const metadata = {
  title: {
    default: 'CompleteAuth — Production-Ready Authentication',
    template: '%s | CompleteAuth',
  },
  description:
    'A complete, self-hosted authentication module with email/password, OAuth, magic links, 2FA, RBAC, and session management.',
  keywords: ['authentication', 'auth', 'next.js', 'better-auth', 'oauth', '2fa'],
  robots: 'noindex,nofollow', // Auth pages should not be indexed
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="bg-orbs" aria-hidden="true" />
        <div className="bg-orb-3" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

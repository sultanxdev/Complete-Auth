import { redirect } from 'next/navigation';

export default function HomePage() {
  // The root page redirects to the login page.
  // Protected pages redirect to /login if unauthenticated.
  redirect('/login');
}

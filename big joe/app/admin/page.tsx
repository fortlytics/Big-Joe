'use client';

import { useEffect, useState } from 'react';
import { isAdminAuthenticated } from '@/lib/auth';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';

export default function AdminPage() {
  // Start `null` (unknown) rather than `false`, so we don't flash the login
  // form for a split second before checking sessionStorage on mount.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading sessionStorage can't happen during SSR, so this has to be an
    // effect (not a lazy useState initializer) to avoid a hydration
    // mismatch between server (always "logged out") and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAdminAuthenticated());
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return <AdminPanel onLoggedOut={() => setAuthed(false)} />;
}

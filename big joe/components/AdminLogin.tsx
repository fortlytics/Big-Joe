'use client';

import { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { attemptAdminLogin } from '@/lib/auth';

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const result = await attemptAdminLogin(password);
    setChecking(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error ?? 'Incorrect password.');
      setPassword('');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-edge bg-surface p-6 shadow-glow">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue/15 text-blue-glow">
            <Lock size={18} />
          </div>
          <div>
            <h1 className="font-display text-lg text-ink">Dealer CMS</h1>
            <p className="tech-label">Restricted access</p>
          </div>
        </div>

        <label className="mb-2 block text-xs text-mute">Admin password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="w-full rounded-md border border-edge bg-surface2 px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue-glow"
        />

        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-glow">
            <ShieldAlert size={14} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={checking || !password}
          className="mt-5 w-full rounded-md bg-blue py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Unlock CMS'}
        </button>

        <p className="mt-4 text-center text-[11px] text-mute">
          Verified server-side — your password is never stored in the browser bundle.
        </p>
      </form>
    </div>
  );
}

'use client';

/**
 * Client-side session handling for the Dealer CMS. The password itself is
 * verified server-side (see app/api/auth/login/route.ts) — this file only
 * stores and checks the signed session token the server issues; it never
 * sees or compares the real password.
 */

const SESSION_KEY = 'bigjoe_admin_session';

interface StoredSession {
  token: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  return readSession() !== null;
}

/** Token to attach as `Authorization: Bearer <token>` on write requests. */
export function getAdminToken(): string | null {
  return readSession()?.token ?? null;
}

export async function attemptAdminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Login failed.' };
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt }));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export function adminLogout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

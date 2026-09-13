'use client';

import type { Car } from './types';
import { getAdminToken } from './auth';

export async function publishCarsToSheet(cars: Car[]): Promise<{ ok: boolean; error?: string }> {
  const token = getAdminToken();
  if (!token) {
    return { ok: false, error: 'Your session expired — log in again.' };
  }

  try {
    const res = await fetch('/api/inventory/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cars }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Publish failed.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

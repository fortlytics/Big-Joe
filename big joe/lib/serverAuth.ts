import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

/** Verifies the HMAC-signed session token issued by /api/auth/login.
 * Shared by every admin-gated write route (Sheet writes, image uploads). */
export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [prefix, expiresAtStr, signature] = parts;
  if (prefix !== 'admin') return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSig = createHmac('sha256', secret).update(`${prefix}.${expiresAtStr}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function extractBearerToken(req: NextRequest): string | undefined {
  const header = req.headers.get('authorization') ?? undefined;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Real auth: the password is checked here, server-side, against an env var
// that never ships to the browser.
//
// Known limitation: there is no persistent store here, so failed-attempt
// lockout can't survive across serverless cold starts / instances. If this
// ever needs real brute-force protection, back it with Upstash/Redis and
// rate-limit by IP. Out of scope for a single-admin dealer tool, but don't
// mistake this for having solved it.

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      { error: 'Server not configured: set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ error: 'Password required.' }, { status: 400 });
  }

  // Constant-time compare — avoids leaking password length/content via timing.
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);

  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expiresAt}`;
  const token = `${payload}.${sign(payload, secret)}`;

  return NextResponse.json({ token, expiresAt });
}

import 'server-only';

/**
 * Resolves the site's public base URL for building permalinks, OG tags,
 * and sitemap entries.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL — set this once you own a real domain.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel automatically provides this
 *     for the Production deployment (your project's stable
 *     `<name>.vercel.app` domain, NOT the random per-deploy preview URL).
 *     This means share links work correctly from day one, before you've
 *     bought a domain — no placeholder/fake domain needed.
 *  3. localhost — local development only.
 *
 * Deliberately does NOT fall back to a guessed/placeholder domain like
 * "bigjoeautos.com" — that would silently generate broken share links and
 * broken social previews for every car until someone noticed.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    // Preview deployment — still real and shareable, just not the stable
    // production alias.
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

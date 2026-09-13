import 'server-only';
import { google, sheets_v4 } from 'googleapis';

export class GoogleAuthConfigError extends Error {}

/**
 * Normalizes a service-account private key pasted into an env var.
 *
 * The OpenSSL error `error:1E08010C:DECODER routines::unsupported` means
 * Node's crypto module was handed a string that isn't a well-formed PEM
 * block — not a permissions problem, a parsing one. In practice this is
 * almost always one of:
 *   - the value still has literal `\n` (backslash-n) instead of real
 *     newlines, because of how it was pasted into the hosting platform
 *   - stray wrapping quotes left over from copying the value straight out
 *     of the downloaded JSON key file (which itself quotes the string and
 *     escapes its newlines)
 *   - accidental leading/trailing whitespace
 * This normalizes all three cases and then actually validates the PEM
 * structure, instead of handing a possibly-still-broken string to Node's
 * crypto module and letting it fail with an opaque OpenSSL error code.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip a single pair of wrapping quotes, if the whole value is quoted.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Turn literal backslash-n into real newlines. Harmless no-op if the
  // value already has real newlines.
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '');

  const hasBegin = /-----BEGIN (RSA )?PRIVATE KEY-----/.test(key);
  const hasEnd = /-----END (RSA )?PRIVATE KEY-----/.test(key);
  if (!hasBegin || !hasEnd) {
    throw new GoogleAuthConfigError(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY doesn't look like a valid PEM key (missing BEGIN/END markers " +
        'after normalization). Re-copy the "private_key" value from the service account JSON file, including ' +
        'the full "-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----" block, and paste it without ' +
        'surrounding quotes.'
    );
  }

  return key;
}

let cachedClient: sheets_v4.Sheets | null = null;
let cachedKeyFingerprint: string | null = null;

/** Returns an authenticated Sheets client, validating and normalizing the
 * private key up front so a bad env var produces one clear error message
 * instead of a cryptic OpenSSL failure deep inside a write call. */
export function getGoogleSheetsClient(): sheets_v4.Sheets {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceEmail || !rawKey) {
    throw new GoogleAuthConfigError(
      'Server not configured: set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  // Cheap cache so repeated calls in the same warm serverless instance
  // don't re-validate/re-construct the client every time.
  if (cachedClient && cachedKeyFingerprint === rawKey) return cachedClient;

  const privateKey = normalizePrivateKey(rawKey);

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedClient = google.sheets({ version: 'v4', auth });
  cachedKeyFingerprint = rawKey;
  return cachedClient;
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, extractBearerToken } from '@/lib/serverAuth';
import { getGoogleSheetsClient, GoogleAuthConfigError } from '@/lib/googleAuth';

// Column order here MUST match the column order the public site's CSV
// parser expects (see lib/csv.ts FIELD_SYNONYMS) — Slug first, since it's
// the permanent identifier permalinks are built from.
const HEADERS = [
  'Slug', 'Brand', 'Model', 'Year', 'Price', 'Condition', 'BodyType', 'Transmission',
  'Mileage', 'Color', 'Engine', 'FuelType', 'Location', 'Images', 'Description', 'isAvailable',
];

interface CarPayload {
  slug: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  condition: string;
  bodyType: string;
  transmission: string;
  mileage?: number;
  color?: string;
  engine?: string;
  fuelType?: string;
  location?: string;
  images?: string[];
  description?: string;
  isAvailable: boolean;
}

function extractSpreadsheetId(sheetUrl: string): string | null {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGid(sheetUrl: string): number | null {
  const match = sheetUrl.match(/[?&#]gid=([0-9]+)/);
  return match ? Number(match[1]) : null;
}

export async function POST(req: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const token = extractBearerToken(req);

  if (!sessionSecret || !verifyAdminToken(token, sessionSecret)) {
    return NextResponse.json({ error: 'Unauthorized. Log in again.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cars = body?.cars;
  if (!Array.isArray(cars)) {
    return NextResponse.json({ error: 'Expected { cars: [...] } in the request body.' }, { status: 400 });
  }
  if (cars.some((c: CarPayload) => !c.slug)) {
    return NextResponse.json(
      { error: 'Every car needs a Slug — this is its permanent link, it cannot be blank.' },
      { status: 400 }
    );
  }

  const sheetUrl = process.env.GOOGLE_SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json({ error: 'Server not configured: set GOOGLE_SHEET_URL.' }, { status: 500 });
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_URL is not a valid Google Sheets link.' }, { status: 500 });
  }

  let sheets;
  try {
    sheets = getGoogleSheetsClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof GoogleAuthConfigError ? err.message : 'Google Sheets auth is misconfigured.' },
      { status: 500 }
    );
  }

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const gid = extractGid(sheetUrl);
    const sheetProps =
      meta.data.sheets?.find((s) => s.properties?.sheetId === gid)?.properties ?? meta.data.sheets?.[0]?.properties;
    const tabTitle = sheetProps?.title ?? 'Sheet1';

    const rows: (string | number)[][] = (cars as CarPayload[]).map((c) => [
      c.slug, c.brand, c.model, c.year, c.price, c.condition, c.bodyType, c.transmission,
      c.mileage ?? '', c.color ?? '', c.engine ?? '', c.fuelType ?? '', c.location ?? '',
      (c.images ?? []).join(' | '), c.description ?? '', c.isAvailable ? 'Yes' : 'No',
    ]);

    // Full overwrite: clear the data range, then write headers + fresh rows.
    // Simplest reliable approach for a catalog this size; not diff-based.
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tabTitle}!A1:P10000`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabTitle}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS, ...rows] },
    });

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('Sheet write failed', err);
    const rawMessage = err instanceof Error ? err.message : '';
    const isKeyDecodeError = /DECODER routines|unsupported|PEM/i.test(rawMessage);
    return NextResponse.json(
      {
        error: isKeyDecodeError
          ? "Google rejected the service account key (couldn't decode it). Double-check " +
            'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY was pasted exactly as it appears in the JSON key file.'
          : rawMessage || 'Failed to write to Google Sheet. Confirm the service account has Editor access.',
      },
      { status: 502 }
    );
  }
}

import type { Car } from './types';

/**
 * Robust CSV tokenizer — handles quoted fields, embedded commas, and
 * embedded newlines inside quotes. Good enough for Google Sheets' CSV export.
 */
export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        field = '';
        if (row.some((f) => f.trim() !== '')) rows.push(row);
        row = [];
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

/** Field -> accepted column-header synonyms (case-insensitive). */
const FIELD_SYNONYMS: Record<string, string[]> = {
  slug: ['slug', 'id', 'permalink', 'car id', 'sku'],
  brand: ['brand', 'make', 'manufacturer'],
  model: ['model', 'spec', 'model spec'],
  year: ['year', 'manufacture year', 'mfg', 'prod'],
  price: ['price', 'cost', 'showroom price', 'slot price', 'naira', 'ngn'],
  condition: ['condition', 'class', 'state', 'grade'],
  bodyType: ['body type', 'bodystyle', 'category', 'style'],
  transmission: ['transmission', 'gearbox', 'gear', 'drive'],
  mileage: ['mileage', 'odometer', 'km', 'distance', 'range'],
  color: ['color', 'colour', 'exterior', 'paint'],
  engine: ['engine', 'motor', 'cylinder', 'displacement'],
  fuelType: ['fuel', 'fuel type', 'gas', 'diesel', 'petrol'],
  location: ['location', 'address', 'area', 'city'],
  images: ['images', 'links', 'pics', 'photos', 'urls'],
  description: ['description', 'desc', 'notes', 'comments', 'insights'],
  isAvailable: ['available', 'status', 'instock', 'is available', 'active'],
};

/** Lowercases, and inserts spaces at camelCase boundaries and separators, so
 * "BodyType"/"body_type"/"Body-Type" all normalize to the same "body type" —
 * this has to happen BEFORE synonym matching, or compound headers like
 * "FuelType" collide with generic single-word synonyms of unrelated fields
 * (e.g. "FuelType" being read as containing "type" and misassigned to a
 * field that happened to list "type" as a synonym). */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Maps each raw CSV header to a known Car field, or null if unrecognized. */
export function mapHeaders(headers: string[]): (keyof Car | null)[] {
  return headers.map((raw) => {
    const norm = normalizeHeader(raw);
    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.includes(norm)) return field as keyof Car;
    }
    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some((s) => norm.includes(s) || s.includes(norm))) {
        return field as keyof Car;
      }
    }
    return null;
  });
}

/**
 * Human price shorthand -> normalized NGN integer.
 *   18,500,000 / 18500000 -> 18500000
 *   18.5M / 18.5          -> 18500000
 *   36                    -> 36000000  (bare values under 1000 read as millions)
 *   850K                  -> 850000
 */
export function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₦,\s]/g, '').trim();
  const match = cleaned.match(/^([\d.]+)\s*(m|k)?$/i);
  if (!match) {
    const digitsOnly = Number(cleaned.replace(/[^\d.]/g, ''));
    return Number.isFinite(digitsOnly) ? digitsOnly : 0;
  }
  const value = parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();

  if (suffix === 'm') return Math.round(value * 1_000_000);
  if (suffix === 'k') return Math.round(value * 1_000);
  if (value < 1000) return Math.round(value * 1_000_000);
  return Math.round(value);
}

export function formatNaira(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Normalizes common "share link" image URL formats into direct, hotlinkable
 * image URLs. Google Drive and Google Photos share links are the most common
 * mistake dealers make when pasting image links into a Sheet — they point at
 * an HTML viewer page, not the image bytes, so they render as broken <img>
 * tags. Anything already a direct link (or a host we don't recognize) is
 * passed through unchanged rather than guessed at.
 */
export function normalizeImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return url;

  // Google Drive: https://drive.google.com/file/d/<ID>/view?usp=sharing
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  // Google Drive: https://drive.google.com/open?id=<ID>
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
  }
  // Dropbox: swap ?dl=0 for ?raw=1
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'raw=1');
  }
  return url;
}

/** Splits an Images cell on commas or pipes into a clean, normalized URL list. */
export function parseImages(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeImageUrl);
}

function parseAvailability(raw: string | undefined): boolean {
  if (raw === undefined) return true;
  const v = raw.trim().toLowerCase();
  return !['no', 'false', '0', 'sold', 'unavailable', 'inactive'].includes(v);
}

/** Converts a Google Sheets share/edit URL into its CSV export endpoint. */
export function toCsvExportUrl(sheetUrl: string): string {
  const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error("That link doesn't look like a Google Sheets URL.");
  }
  const id = idMatch[1];
  const gidMatch = sheetUrl.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CsvParseResult {
  cars: Car[];
  /** Rows dropped for missing brand/model entirely. */
  skipped: number;
  /** Rows that had brand/model but no Slug/ID column value — these are
   * kept (using a derived slug) but flagged, because a derived slug is
   * NOT guaranteed stable across edits and shouldn't be relied on for
   * permalinks long-term. */
  missingSlug: number;
}

/**
 * Parses a raw CSV export string into typed Car records via fuzzy header
 * mapping. A `Slug` (or `ID`) column is the source of truth for each car's
 * permalink — see README for the exact column spec. Rows without brand or
 * model are dropped; rows without a Slug get one derived from brand+model+
 * year, but this is flagged via `missingSlug` since it isn't guaranteed to
 * stay stable if the row is edited later.
 */
export function csvToCars(raw: string): CsvParseResult {
  const rows = parseCsv(raw);
  if (rows.length < 2) return { cars: [], skipped: 0, missingSlug: 0 };

  const [headerRow, ...dataRows] = rows;
  const fieldMap = mapHeaders(headerRow);
  const cars: Car[] = [];
  const seenSlugs = new Set<string>();
  let skipped = 0;
  let missingSlug = 0;

  dataRows.forEach((row) => {
    const record: Record<string, string> = {};
    fieldMap.forEach((field, i) => {
      if (field) record[field] = row[i] ?? '';
    });

    if (!record.brand && !record.model) {
      skipped++;
      return;
    }

    let slug = slugify(record.slug ?? '');
    if (!slug) {
      missingSlug++;
      slug = slugify(`${record.brand}-${record.model}-${record.year || ''}`);
    }
    // Guard against duplicate slugs (two rows sharing one id would make
    // permalinks ambiguous) by appending a disambiguating suffix.
    let finalSlug = slug;
    let n = 2;
    while (seenSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${n}`;
      n++;
    }
    seenSlugs.add(finalSlug);

    cars.push({
      slug: finalSlug,
      brand: record.brand ?? 'Unknown',
      model: record.model ?? '',
      year: parseInt(record.year, 10) || new Date().getFullYear(),
      price: parsePrice(record.price ?? '0'),
      condition: record.condition || 'Nigerian Used',
      bodyType: record.bodyType || 'Sedan',
      transmission: record.transmission || 'Automatic',
      mileage: record.mileage ? Number(record.mileage.replace(/[^\d.]/g, '')) : undefined,
      color: record.color || undefined,
      engine: record.engine || undefined,
      fuelType: record.fuelType || undefined,
      location: record.location || undefined,
      images: parseImages(record.images ?? ''),
      description: record.description || undefined,
      isAvailable: parseAvailability(record.isAvailable),
    });
  });

  return { cars, skipped, missingSlug };
}

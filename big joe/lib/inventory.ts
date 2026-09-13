import 'server-only';
import { csvToCars, toCsvExportUrl } from './csv';
import type { Car, FilterOptions } from './types';

/** How often (seconds) the catalog re-fetches the Sheet in the background.
 * Visitors always get a fast cached response; Next.js revalidates this
 * fetch at most this often and swaps in fresh data once it lands
 * (stale-while-revalidate), so an edit in the Sheet shows up site-wide
 * within about this window without a redeploy. */
const REVALIDATE_SECONDS = 90;

export class InventoryUnavailableError extends Error {}

async function fetchRawCsv(): Promise<string> {
  const sheetUrl = process.env.GOOGLE_SHEET_URL;
  if (!sheetUrl) {
    throw new InventoryUnavailableError(
      'GOOGLE_SHEET_URL is not set. Add it to your environment (see .env.example).'
    );
  }

  let csvUrl: string;
  try {
    csvUrl = toCsvExportUrl(sheetUrl);
  } catch {
    throw new InventoryUnavailableError('GOOGLE_SHEET_URL is not a valid Google Sheets link.');
  }

  const res = await fetch(csvUrl, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new InventoryUnavailableError(
      `Could not load the inventory sheet (status ${res.status}). Make sure it's shared as "Anyone with the link — Viewer".`
    );
  }
  return res.text();
}

/** Fetches and parses the full live inventory. Throws InventoryUnavailableError
 * on any failure — callers decide how to present that, but it never falls
 * back to fake/placeholder cars. */
export async function getAllCars(): Promise<Car[]> {
  const raw = await fetchRawCsv();
  const { cars } = csvToCars(raw);
  return cars;
}

export async function getCarBySlug(slug: string): Promise<Car | null> {
  const cars = await getAllCars();
  return cars.find((c) => c.slug === slug) ?? null;
}

export function getFilterOptions(cars: Car[]): FilterOptions {
  return {
    brands: [...new Set(cars.map((c) => c.brand))].sort(),
    bodyTypes: [...new Set(cars.map((c) => c.bodyType))].sort(),
    conditions: [...new Set(cars.map((c) => c.condition))].sort(),
    transmissions: [...new Set(cars.map((c) => c.transmission))].sort(),
    fuelTypes: [...new Set(cars.map((c) => c.fuelType).filter(Boolean))].sort(),
    locations: [...new Set(cars.map((c) => c.location).filter(Boolean))].sort(),
  };
}

export interface CatalogQuery {
  page?: number;
  perPage?: number;
  search?: string;
  brand?: string;
  bodyType?: string;
  condition?: string;
  transmission?: string;
  fuelType?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CatalogResult {
  cars: Car[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  options: FilterOptions;
  priceBounds: { min: number; max: number };
}

/** Applies filters + pagination server-side. Filters and page number both
 * live in the URL (see app/inventory/page.tsx), so every filtered/paginated
 * view is itself a real, shareable, bookmarkable link — not just client
 * state that resets on reload. */
export function filterAndPaginate(all: Car[], query: CatalogQuery): CatalogResult {
  const options = getFilterOptions(all);
  const priceBounds = all.length
    ? { min: Math.min(...all.map((c) => c.price)), max: Math.max(...all.map((c) => c.price)) }
    : { min: 0, max: 0 };

  const q = (query.search ?? '').trim().toLowerCase();
  const filtered = all.filter((c) => {
    if (q && !`${c.brand} ${c.model}`.toLowerCase().includes(q)) return false;
    if (query.brand && query.brand !== 'All' && c.brand !== query.brand) return false;
    if (query.bodyType && query.bodyType !== 'All' && c.bodyType !== query.bodyType) return false;
    if (query.condition && query.condition !== 'All' && c.condition !== query.condition) return false;
    if (query.transmission && query.transmission !== 'All' && c.transmission !== query.transmission)
      return false;
    if (query.fuelType && query.fuelType !== 'All' && c.fuelType !== query.fuelType) return false;
    if (query.location && query.location !== 'All' && c.location !== query.location) return false;
    if (query.minPrice !== undefined && c.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && c.price > query.maxPrice) return false;
    return true;
  });

  const perPage = query.perPage ?? 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
  const start = (page - 1) * perPage;

  return {
    cars: filtered.slice(start, start + perPage),
    total: filtered.length,
    page,
    perPage,
    totalPages,
    options,
    priceBounds,
  };
}

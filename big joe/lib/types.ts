export interface Car {
  /** Stable identifier — comes from the Sheet's own Slug/ID column, never
   * derived from row position. This is what permalinks are built from, so
   * it must not change when rows are reordered, added, or removed. */
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
  images: string[];
  description?: string;
  isAvailable: boolean;
}

export interface FilterState {
  search: string;
  brand: string;
  bodyType: string;
  condition: string;
  transmission: string;
  fuelType: string;
  location: string;
  minPrice: number;
  maxPrice: number;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  brand: 'All',
  bodyType: 'All',
  condition: 'All',
  transmission: 'All',
  fuelType: 'All',
  location: 'All',
  minPrice: 0,
  maxPrice: Number.MAX_SAFE_INTEGER,
};

export interface FilterOptions {
  brands: string[];
  bodyTypes: string[];
  conditions: string[];
  transmissions: string[];
  fuelTypes: string[];
  locations: string[];
}

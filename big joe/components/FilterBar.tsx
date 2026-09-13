import Link from 'next/link';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { NAVBAR_HEIGHT_PX } from '@/components/Navbar';
import type { FilterOptions } from '@/lib/types';

interface FilterBarProps {
  options: FilterOptions;
  priceBounds: { min: number; max: number };
  current: {
    search?: string;
    brand?: string;
    bodyType?: string;
    condition?: string;
    transmission?: string;
    fuelType?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

function Select({ name, label, value, values }: { name: string; label: string; value?: string; values: string[] }) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-mute">
      {label}
      <div className="relative">
        <select
          name={name}
          defaultValue={value ?? 'All'}
          className="w-full appearance-none rounded-lg border border-edge bg-surface2 py-2.5 pl-3 pr-8 text-sm font-medium normal-case text-ink outline-none transition-colors hover:border-blue-glow/50 focus-visible:border-blue-glow"
        >
          <option value="All">All</option>
          {values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mute" />
      </div>
    </label>
  );
}

/** A plain GET form: submitting it navigates to /inventory?search=...&brand=...
 * — no client JS required for filtering to work, and the resulting URL is
 * itself a real, shareable "here's what I found" link. */
export function FilterBar({ options, priceBounds, current }: FilterBarProps) {
  const hasActiveFilters =
    current.search ||
    (current.brand && current.brand !== 'All') ||
    (current.bodyType && current.bodyType !== 'All') ||
    (current.condition && current.condition !== 'All') ||
    (current.transmission && current.transmission !== 'All') ||
    (current.fuelType && current.fuelType !== 'All') ||
    (current.location && current.location !== 'All');

  return (
    <div style={{ top: NAVBAR_HEIGHT_PX }} className="sticky z-30 bg-base/80 py-4 backdrop-blur-md">
      <form method="get" action="/inventory" id="catalog-filters" className="mx-auto max-w-7xl px-5 sm:px-10">
        <div className="rounded-2xl border border-edge bg-surface/90 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[13rem] flex-[2] flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-mute">
              Search
              <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface2 px-3 py-2.5 transition-colors focus-within:border-blue-glow">
                <Search size={15} className="shrink-0 text-mute" />
                <input
                  name="search"
                  defaultValue={current.search}
                  placeholder="Search brand or model…"
                  className="w-full bg-transparent text-sm font-medium normal-case text-ink outline-none placeholder:font-normal placeholder:text-mute/70"
                />
              </div>
            </label>

            <Select name="brand" label="Brand" value={current.brand} values={options.brands} />
            <Select name="bodyType" label="Body type" value={current.bodyType} values={options.bodyTypes} />
            <Select name="condition" label="Condition" value={current.condition} values={options.conditions} />
            <Select name="transmission" label="Transmission" value={current.transmission} values={options.transmissions} />
            <Select name="fuelType" label="Fuel type" value={current.fuelType} values={options.fuelTypes} />
            <Select name="location" label="Location" value={current.location} values={options.locations} />

            <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-mute">
              <span className="flex items-center gap-1">
                <SlidersHorizontal size={11} /> Price range (₦)
              </span>
              <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface2 px-2 py-1">
                <input
                  name="minPrice"
                  type="number"
                  defaultValue={current.minPrice ?? priceBounds.min}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  className="w-full min-w-0 bg-transparent px-1 py-1.5 text-sm font-medium normal-case text-ink outline-none"
                />
                <span className="text-mute">–</span>
                <input
                  name="maxPrice"
                  type="number"
                  defaultValue={current.maxPrice ?? priceBounds.max}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  className="w-full min-w-0 bg-transparent px-1 py-1.5 text-sm font-medium normal-case text-ink outline-none"
                />
              </div>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-red to-red-glow px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.35)] transition-transform hover:scale-[1.03]"
              >
                Apply
              </button>
              {hasActiveFilters && (
                <Link
                  href="/inventory"
                  aria-label="Clear filters"
                  className="flex items-center justify-center rounded-lg border border-edge px-3 text-mute transition-colors hover:border-red/50 hover:text-red-glow"
                >
                  <X size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

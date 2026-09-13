import type { Metadata } from 'next';
import { getAllCars, filterAndPaginate, InventoryUnavailableError } from '@/lib/inventory';
import { CarCard } from '@/components/CarCard';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { NAVBAR_HEIGHT_PX } from '@/components/Navbar';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inventory | Big Joe Autos',
  description: "Browse Big Joe Autos' live vehicle inventory: Toyota, Lexus, Mercedes-Benz, Honda, Hyundai, KIA, Nissan and Ford, updated straight from our stock sheet.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  let cars;
  try {
    cars = await getAllCars();
  } catch (err) {
    return (
      <main style={{ paddingTop: NAVBAR_HEIGHT_PX }} className="min-h-screen bg-base">
        <div className="mx-auto max-w-3xl px-5 py-32 text-center sm:px-10">
          <AlertTriangle size={40} className="mx-auto mb-4 text-red-glow" />
          <h1 className="font-display text-2xl font-bold text-ink">Inventory temporarily unavailable</h1>
          <p className="mt-3 text-sm text-mute">
            {err instanceof InventoryUnavailableError
              ? err.message
              : 'Something went wrong loading the catalog. Please try again shortly.'}
          </p>
        </div>
      </main>
    );
  }

  const result = filterAndPaginate(cars, {
    page: sp.page ? Number(sp.page) : 1,
    search: sp.search,
    brand: sp.brand,
    bodyType: sp.bodyType,
    condition: sp.condition,
    transmission: sp.transmission,
    fuelType: sp.fuelType,
    location: sp.location,
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
  });

  return (
    <main style={{ paddingTop: NAVBAR_HEIGHT_PX }} className="relative min-h-screen bg-base">
      <div className="ambient-bg" />
      <div className="ambient-grid" />

      <div className="relative z-10 section-header reveal in-view !mb-8 px-5 pt-12 sm:px-10">
        <div className="section-label">Live Stock</div>
        <h1 className="section-title">Full Inventory</h1>
        <p className="section-subtitle">
          {result.total} vehicle{result.total === 1 ? '' : 's'} in stock, synced live from our showroom sheet.
        </p>
      </div>

      <div className="relative z-10">
        <FilterBar
          options={result.options}
          priceBounds={result.priceBounds}
          current={{
            search: sp.search,
            brand: sp.brand,
            bodyType: sp.bodyType,
            condition: sp.condition,
            transmission: sp.transmission,
            fuelType: sp.fuelType,
            location: sp.location,
            minPrice: sp.minPrice,
            maxPrice: sp.maxPrice,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-10">
        {result.cars.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-edge bg-surface p-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface2 text-mute">
              <AlertTriangle size={22} />
            </div>
            <p className="font-display text-lg font-semibold text-ink">No vehicles match those filters</p>
            <p className="max-w-sm text-sm text-mute">Try widening the price range or clearing a filter to see more of our stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.cars.map((car, i) => (
              // Only the first couple of cards are above the fold on desktop:
              // prioritize those for LCP, lazy-load (default) the rest.
              <CarCard key={car.slug} car={car} priority={i < 4} />
            ))}
          </div>
        )}

        <Pagination page={result.page} totalPages={result.totalPages} searchParams={sp} />
      </div>
    </main>
  );
}

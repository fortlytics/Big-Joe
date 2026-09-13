import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Gauge, Fuel, ArrowUpRight } from 'lucide-react';
import type { Car } from '@/lib/types';
import { formatNaira } from '@/lib/csv';

export function CarCard({ car, priority = false }: { car: Car; priority?: boolean }) {
  const cover = car.images[0];

  const chips = [
    { icon: Calendar, label: String(car.year) },
    car.mileage !== undefined ? { icon: Gauge, label: `${Math.round(car.mileage / 1000)}K km` } : null,
    car.fuelType ? { icon: Fuel, label: car.fuelType } : null,
  ].filter(Boolean) as { icon: typeof Calendar; label: string }[];

  return (
    <Link
      href={`/inventory/${car.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:border-red/40 hover:shadow-[0_20px_50px_-12px_rgba(220,38,38,0.25)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface2">
        {cover ? (
          <Image
            src={cover}
            alt={`${car.brand} ${car.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-mute">No image provided</div>
        )}

        {/* Permanent subtle shade so badges/text stay legible on any photo */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="pill bg-blue/90 text-white backdrop-blur-sm">{car.condition}</span>
          <span className="pill bg-black/60 text-ink backdrop-blur-sm">{car.bodyType}</span>
        </div>

        <span
          className={`pill absolute right-3 top-3 backdrop-blur-sm ${
            car.isAvailable ? 'bg-ok/90 text-black' : 'bg-red/90 text-white'
          }`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          {car.isAvailable ? 'Available' : 'Sold'}
        </span>

        {(car.location || car.transmission) && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3.5 py-2.5 text-[11px] font-medium text-ink/90">
            {car.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-blue-glow" /> {car.location}
              </span>
            )}
            <span>{car.transmission}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-glow">{car.brand}</p>
          <h3 className="mt-0.5 font-display text-xl font-bold leading-tight text-ink">{car.model}</h3>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1 rounded-md bg-surface2 px-2 py-1 text-[11px] text-mute"
              >
                <Icon size={12} /> {label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-edge pt-3.5">
          <div>
            <p className="tech-label">Showroom price</p>
            <p className="font-display text-xl font-bold tracking-tight text-ink">{formatNaira(car.price)}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-all duration-300 group-hover:rotate-45 group-hover:bg-red group-hover:text-white">
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Gauge, Fuel, Palette, Cog, MapPin, ArrowLeft, Clock, ShieldCheck, MessageCircle } from 'lucide-react';
import { getAllCars, getCarBySlug } from '@/lib/inventory';
import { formatNaira } from '@/lib/csv';
import { ShareBar } from '@/components/ShareBar';
import { CarCard } from '@/components/CarCard';
import { CarGallery } from '@/components/CarGallery';
import { NAVBAR_HEIGHT_PX } from '@/components/Navbar';
import { getSiteUrl } from '@/lib/site';

const SITE_URL = getSiteUrl();

// Same claims already made on the homepage's Why Us section, reused here,
// not invented per-vehicle, since none of this is specific to this car.
const TRUST_POINTS = [
  { icon: Clock, label: 'Open 24 hours', desc: 'Visit the showroom any time, any day.' },
  { icon: ShieldCheck, label: 'Inspected on arrival', desc: 'Every vehicle checked before listing.' },
  { icon: MessageCircle, label: 'Fast WhatsApp reply', desc: 'Direct line to the dealer, not a call center.' },
];

// Revalidate this page in the background at most this often, so an edit in
// the Sheet reaches an already-cached car page without a redeploy.
export const revalidate = 90;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCarBySlug(slug).catch(() => null);
  if (!car) return { title: 'Vehicle not found | Big Joe Autos' };

  const title = `${car.year} ${car.brand} ${car.model} | ${formatNaira(car.price)} | Big Joe Autos`;
  const description = `${car.condition} · ${car.bodyType} · ${car.transmission}${
    car.mileage ? ` · ${car.mileage.toLocaleString()}km` : ''
  }. ${car.description ?? 'Available now at Big Joe Autos, Oko Erin, Ilorin.'}`.slice(0, 200);
  const image = car.images[0];

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/inventory/${car.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/inventory/${car.slug}`,
      siteName: 'Big Joe Autos',
      images: image ? [{ url: image, width: 1200, height: 900, alt: `${car.brand} ${car.model}` }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CarDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const car = await getCarBySlug(slug).catch(() => null);
  if (!car) notFound();

  const permalink = `${SITE_URL}/inventory/${car.slug}`;
  const allCars = await getAllCars().catch(() => []);
  const similar = allCars.filter((c) => c.slug !== car.slug && c.brand === car.brand).slice(0, 3);

  const specs = [
    { icon: Calendar, label: 'Year', value: String(car.year) },
    car.mileage !== undefined ? { icon: Gauge, label: 'Mileage', value: `${car.mileage.toLocaleString()} km` } : null,
    car.fuelType ? { icon: Fuel, label: 'Fuel', value: car.fuelType } : null,
    car.color ? { icon: Palette, label: 'Color', value: car.color } : null,
    { icon: Cog, label: 'Transmission', value: car.transmission },
    car.engine ? { icon: Cog, label: 'Engine', value: car.engine } : null,
  ].filter(Boolean) as { icon: typeof Calendar; label: string; value: string }[];

  return (
    <main style={{ paddingTop: NAVBAR_HEIGHT_PX }} className="relative min-h-screen bg-base">
      <div className="ambient-bg" />
      <div className="ambient-grid" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 pb-20 sm:px-10">
        <Link href="/inventory" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
          <ArrowLeft size={15} /> Back to inventory
        </Link>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:gap-12">
          <div className="lg:sticky lg:top-24">
            <CarGallery
              images={car.images}
              alt={`${car.brand} ${car.model}`}
              badge={{ label: car.isAvailable ? 'Available' : 'Sold', tone: car.isAvailable ? 'ok' : 'red' }}
            />
          </div>

          <div className="rounded-2xl border border-edge bg-surface/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-edge pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-glow">{car.brand}</p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{car.model}</h1>
              </div>
              <span className={`pill ${car.isAvailable ? 'bg-ok/15 text-ok' : 'bg-red/15 text-red-glow'}`}>
                {car.isAvailable ? 'Available' : 'Sold'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-5">
              <span className="pill bg-surface2 text-ink">{car.condition}</span>
              <span className="pill bg-surface2 text-ink">{car.bodyType}</span>
              {car.location && (
                <span className="pill bg-surface2 text-ink">
                  <MapPin size={11} /> {car.location}
                </span>
              )}
            </div>

            <div className="mt-7">
              <p className="tech-label">Showroom price</p>
              <div className="mt-1 font-display text-3xl font-bold text-ink">{formatNaira(car.price)}</div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.label} className="rounded-xl border border-edge bg-surface2/55 p-3.5 transition-colors hover:border-blue-glow/30">
                  <div className="flex items-center gap-2 text-mute">
                    <s.icon size={15} className="shrink-0 text-red-glow" />
                    <p className="text-[11px]">{s.label}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            {car.description && (
              <div className="mt-7 border-t border-edge pt-6">
                <p className="tech-label">About this vehicle</p>
                <p className="mt-2 text-sm leading-7 text-mute">{car.description}</p>
              </div>
            )}

            <div className="mt-8">
              <ShareBar car={car} permalink={permalink} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 border-t border-edge pt-6 sm:grid-cols-3">
              {TRUST_POINTS.map((t) => (
                <div key={t.label} className="flex items-start gap-2.5">
                  <t.icon size={16} className="mt-0.5 shrink-0 text-blue-glow" />
                  <div>
                    <p className="text-xs font-semibold text-ink">{t.label}</p>
                    <p className="text-[11px] text-mute">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 font-display text-xl font-bold text-ink">More {car.brand}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((c) => (
                <CarCard key={c.slug} car={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import {
  Search, Phone, PhoneCall, MessageCircle, Mail, Clock, ShieldCheck, BadgePercent,
  Headphones, Repeat, MapPin, Navigation, ArrowRight,
} from 'lucide-react';
import { getAllCars } from '@/lib/inventory';
import { formatNaira } from '@/lib/csv';
import { LandingFX } from '@/components/LandingFX';

const BRANDS = [
  { name: 'Toyota', file: 'Toyota_carlogo.svg' },
  { name: 'Lexus', file: 'Lexus.svg' },
  { name: 'Mercedes-Benz', file: 'Mercedes-Benz_Star.svg' },
  { name: 'Honda', file: 'Honda.svg' },
  { name: 'Hyundai', file: 'Hyundai_Motor_Company_logo.svg' },
  { name: 'KIA', file: 'KIA_logo3.svg' },
  { name: 'Nissan', file: 'Nissan_2020_logo.svg' },
  { name: 'Ford', file: 'Ford_Motor_Company_Logo.svg' },
];

const EXOTICS = [
  { name: 'Lamborghini Huracán', file: 'Lamborghini_Hurac%C3%A1n_Evo_White.jpg' },
  { name: 'Ferrari 488 GTB', file: '2018_Ferrari_488_GTB.jpg' },
  { name: 'McLaren 720S', file: 'McLaren_720S_Orange.jpg' },
  { name: 'Bugatti Chiron', file: 'Bugatti_Chiron_(1).jpg' },
  { name: 'Rolls-Royce Phantom', file: '2022_Rolls-Royce_Phantom_V12_Auto.jpg' },
  { name: 'Porsche 911', file: 'Porsche_911_991_Club_Coupe.jpg' },
];

const WHY_US = [
  { icon: Clock, title: 'Open 24 Hours', desc: "We're always open. Visit us anytime at Lagos/Ogbomosho Expressway, Ilorin, day or night, we're here to serve you." },
  { icon: ShieldCheck, title: 'Trusted Quality', desc: 'Every vehicle is thoroughly inspected and verified. We stand behind every car we sell.' },
  { icon: BadgePercent, title: 'Best Prices', desc: 'Competitive pricing on all brands. Get premium vehicles without the premium markup.' },
  { icon: Headphones, title: 'Expert Support', desc: 'Our knowledgeable team helps you find the perfect vehicle for your needs and budget.' },
  { icon: Repeat, title: 'Trade-Ins Welcome', desc: 'Upgrade your ride easily. We accept trade-ins and offer fair market value.' },
  { icon: MapPin, title: 'Prime Location', desc: 'Conveniently located at Lagos/Ogbomosho Expressway, Odota Geri Alimi, Ilorin. Easy to find, easier to do business with.' },
];

function wiki(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`;
}

export default async function HomePage() {
  const cars = await getAllCars().catch(() => []);
  const featured = cars.filter((c) => c.isAvailable).slice(0, 3);

  return (
    <>
      <LandingFX />

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <canvas id="particles" />

        <div className="hero-car hero-car-1">V8</div>
        <div className="hero-car hero-car-2">GT</div>

        <div className="hero-content">
          <div className="hero-badge">Open 24 Hours - Odota Geri Alimi, Ilorin</div>
          <h1 className="hero-title">
            <span className="line">Drive Your</span>
            <span className="line accent">Dream</span>
            <span className="line">Today</span>
          </h1>
          <p className="hero-subtitle">
            Big Joe Autos is Ilorin&apos;s premier destination for premium vehicles. From Toyota to
            Mercedes, we bring you the finest automobiles with unmatched service and 24-hour availability.
          </p>
          <div className="hero-buttons">
            <Link href="/inventory" className="btn-primary">
              <Search size={16} /> Explore Cars
            </Link>
            <a href="tel:08181597529" className="btn-secondary">
              <PhoneCall size={16} /> 0818 159 7529
            </a>
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number" data-count="8">0</div>
            <div className="stat-label">Major Brands</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="24">0</div>
            <div className="stat-label">Hours Open</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="100">0</div>
            <div className="stat-label">+ Cars Sold</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="5">0</div>
            <div className="stat-label">Star Service</div>
          </div>
        </div>
      </div>

      {/* Brands */}
      <section className="section brands-section" id="brands">
        <div className="section-header reveal">
          <div className="section-label">Authorized Dealer</div>
          <h2 className="section-title">Premium Brands</h2>
          <p className="section-subtitle">
            We stock and service the world&apos;s most trusted automotive brands, all under one roof in Ilorin.
          </p>
        </div>
        <div className="brands-grid">
          {BRANDS.map((b) => (
              <div key={b.name} className={`brand-card reveal ${b.name === 'Ford' ? 'brand-card--ford' : ''}`}>
              {/* Third-party (Wikimedia) SVG logos, plain <img>, not next/image,
                  since these are external vector marks, not photos to optimize. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="brand-icon"><img src={wiki(b.file)} alt={`${b.name} logo`} loading="lazy" /></div>
              <div className="brand-name">{b.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Inventory, live from the Sheet, not hardcoded */}
      {featured.length > 0 && (
        <section className="section featured-section" id="inventory">
          <div className="section-header reveal">
            <div className="section-label">Current Stock</div>
            <h2 className="section-title">Featured Vehicles</h2>
            <p className="section-subtitle">
              Handpicked premium vehicles ready for immediate delivery. Visit our showroom or call for the latest arrivals.
            </p>
          </div>
          <div className="featured-grid">
            {featured.map((car, i) => (
              <Link key={car.slug} href={`/inventory/${car.slug}`} className="featured-card reveal">
                <div className="featured-image">
                  <Image
                    src={car.images[0]}
                    alt={`${car.brand} ${car.model}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={i === 0}
                    loading={i === 0 ? undefined : 'lazy'}
                    className="object-cover"
                  />
                </div>
                <div className="featured-content">
                  <span className="featured-tag">{car.bodyType}</span>
                  <h3 className="featured-title">{car.brand} {car.model}</h3>
                  <p className="featured-desc">{car.description ?? `${car.condition} · ${car.transmission} · ${car.year}`}</p>
                  <div className="featured-price">{formatNaira(car.price)}</div>
                </div>
              </Link>
            ))}
          </div>
          <div className="reveal" style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/inventory" className="btn-secondary" style={{ display: 'inline-flex' }}>
              View Full Inventory <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* Exotic Cars Floating Carousel */}
      <section className="exotic-section">
        <div className="section-header reveal">
          <div className="section-label">The Dream Garage</div>
          <h2 className="section-title">Icons That Inspire Us</h2>
          <p className="section-subtitle">
            The legends that set the bar for automotive excellence, with the same passion for engineering we bring to every car on our lot.
          </p>
        </div>
        <div className="exotic-fade-left" />
        <div className="exotic-fade-right" />
        <div className="exotic-carousel-track">
          {[...EXOTICS, ...EXOTICS].map((car, i) => (
            <div key={`${car.name}-${i}`} className="exotic-card">
              <Image
                src={wiki(car.file)}
                alt={car.name}
                fill
                sizes="340px"
                loading="lazy"
                unoptimized
                className="object-cover"
              />
              <div className="exotic-card-label">{car.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section why-section" id="why-us">
        <div className="section-header reveal">
          <div className="section-label">Our Promise</div>
          <h2 className="section-title">Why Choose Big Joe</h2>
          <p className="section-subtitle">We&apos;re not just selling cars, we&apos;re building trust, one vehicle at a time.</p>
        </div>
        <div className="why-grid">
          {WHY_US.map((w) => (
            <div key={w.title} className="why-card reveal">
              <div className="why-icon"><w.icon size={24} /></div>
              <h3 className="why-title">{w.title}</h3>
              <p className="why-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="reveal">
          <h2 className="cta-title">Ready to Find Your Perfect Ride?</h2>
          <p className="cta-subtitle">Visit Big Joe Autos today or give us a call. Your dream car is waiting at our Oko Erin showroom.</p>
          <div className="hero-buttons">
            <a href="tel:08181597529" className="btn-primary">
              <Phone size={16} /> Call 0818 159 7529
            </a>
            <a href="https://wa.me/2348181597529" className="btn-secondary" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section contact-section" id="contact-details">
        <div className="section-header reveal">
          <div className="section-label">Get In Touch</div>
          <h2 className="section-title">Visit Our Showroom</h2>
          <p className="section-subtitle">
            Come see our full inventory in person. We&apos;re always open at Lagos/Ogbomosho Expressway, Odota Geri Alimi, Ilorin, and ready to help you drive home in style.
          </p>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <h3>Contact Information</h3>

            <div className="contact-item">
              <div className="contact-icon"><MapPin size={20} /></div>
              <div className="contact-details">
                <h4>Address</h4>
                <p>Lagos/Ogbomosho Expressway,<br />Odota Geri Alimi, Ilorin, Kwara State, Nigeria</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Phone size={20} /></div>
              <div className="contact-details">
                <h4>Phone</h4>
                <p><a href="tel:08181597529">0818 159 7529</a></p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Mail size={20} /></div>
              <div className="contact-details">
                <h4>Email</h4>
                <p><a href="mailto:bigjoeautos@gmail.com">bigjoeautos@gmail.com</a></p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Clock size={20} /></div>
              <div className="contact-details">
                <h4>Business Hours</h4>
                <p>Open 24 Hours, 7 Days a Week</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><MessageCircle size={20} /></div>
              <div className="contact-details">
                <h4>WhatsApp</h4>
                <p><a href="https://wa.me/2348181597529" target="_blank" rel="noopener noreferrer">Chat with us instantly</a></p>
              </div>
            </div>
          </div>

          <div className="contact-map reveal">
            <iframe
              title="Big Joe Autos location on Google Maps"
              src="https://www.google.com/maps?q=Lagos%2FOgbomosho%20Expressway%2C%20Odota%20Geri%20Alimi%2C%20Ilorin&output=embed"
              className="map-preview"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="map-overlay">
              <div>
                <p className="map-overlay-title">Big Joe Autos Showroom</p>
                <p className="map-overlay-address">Lagos/Ogbomosho Expressway, Odota Geri Alimi, Ilorin</p>
              </div>
              <a
                href="https://maps.app.goo.gl/WUeCKV5yqfDGVWom9"
                className="map-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={16} /> Get Directions
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

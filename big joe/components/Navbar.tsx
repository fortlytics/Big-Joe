'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Menu, X } from 'lucide-react';
import { DEALER_PHONE_DISPLAY } from '@/lib/whatsapp';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#brands', label: 'Brands' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/#why-us', label: 'Why Us' },
  { href: '/#contact', label: 'Contact' },
];

// Kept as a named export so FilterBar's sticky offset and page top-padding
// can reference the exact same number instead of a second guessed value.
export const NAVBAR_HEIGHT_PX = 80;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      style={{ height: NAVBAR_HEIGHT_PX }}
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 transition-colors duration-300 sm:px-10 ${
        scrolled ? 'bg-base/95 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur' : 'bg-transparent'
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5" aria-label="Big Joe Autos home">
        <Image src="/logo-mark.png" alt="" width={193} height={213} className="h-9 w-auto sm:h-10" priority />
        <span className="font-display text-base font-bold leading-none text-ink sm:text-lg">
          BIG JOE <span className="text-red-glow">AUTOS</span>
        </span>
      </Link>

      <ul className="hidden items-center gap-8 lg:flex">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="text-sm font-medium text-ink/85 transition-colors hover:text-red-glow">
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="tel:08181597529"
        className="hidden items-center gap-2 rounded-md bg-gradient-to-r from-red to-red-glow px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 lg:flex"
      >
        <Phone size={14} /> {DEALER_PHONE_DISPLAY}
      </a>

      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        className="text-ink lg:hidden"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full flex flex-col gap-1 border-t border-edge bg-base/98 p-5 backdrop-blur lg:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-ink/85 hover:bg-surface"
            >
              {l.label}
            </a>
          ))}
          <a
            href="tel:08181597529"
            className="mt-2 flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-red to-red-glow px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Phone size={14} /> {DEALER_PHONE_DISPLAY}
          </a>
        </div>
      )}
    </nav>
  );
}

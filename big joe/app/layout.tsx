import type { Metadata } from 'next';
import './globals.css';
import { getSiteUrl } from '@/lib/site';

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Big Joe Autos | Premium Car Dealership - Ilorin',
    template: '%s',
  },
  description:
    "Big Joe Autos - Your trusted 24-hour car dealership in Oko Erin, Ilorin. Premium vehicles from Toyota, Lexus, Mercedes, Honda & more.",
  openGraph: {
    siteName: 'Big Joe Autos',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* Google Fonts via link tags rather than next/font/google: this
            keeps font loading independent of the build pipeline (no
            build-time fetch to fonts.googleapis.com required), at the cost
            of a small flash-of-fallback-font on first paint. Deliberately
            NOT using next/font/google here despite it being the better
            long-term choice (self-hosted, no flash, faster) — it requires
            fetching from Google at build time, which isn't reliably
            verifiable in every build environment, and this file only gets
            one shot at working correctly on launch day. Safe to revisit
            post-launch: see the comment in globals.css for the one-file
            upgrade path. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

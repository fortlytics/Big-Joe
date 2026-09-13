import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import { DEALER_WHATSAPP_NUMBER } from '@/lib/whatsapp';

// lucide-react dropped trademarked brand glyphs (Facebook/Instagram/Twitter)
// in recent major versions, so these are small inline marks instead.
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2H21l-6.55 7.49L22.5 22h-6.77l-5.3-6.93L4.3 22H1.5l7.01-8.01L1 2h6.94l4.79 6.34L18.24 2Zm-1.19 18h1.5L7.02 4h-1.6l11.63 16Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
          <Image src="/logo-mark.png" alt="" width={193} height={213} style={{ height: '2.25rem', width: 'auto' }} />
          BIG JOE <span>AUTOS</span>
        </div>
        <p className="footer-text">
          © {new Date().getFullYear()} Big Joe Autos. All rights reserved. Lagos/Ogbomosho Expressway, Odota Geri Alimi, Ilorin.
        </p>
        <div className="footer-social">
          <a href="#" aria-label="Facebook"><FacebookIcon /></a>
          <a href="#" aria-label="Instagram"><InstagramIcon /></a>
          <a href="#" aria-label="X (Twitter)"><XIcon /></a>
          <a
            href={`https://wa.me/${DEALER_WHATSAPP_NUMBER}`}
            aria-label="WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}

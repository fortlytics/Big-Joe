'use client';

import { MessageCircle } from 'lucide-react';
import { buildGeneralEnquiryLink } from '@/lib/whatsapp';

export function WhatsAppFloatingButton() {
  return (
    <a
      href={buildGeneralEnquiryLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Big Joe Autos on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 sm:px-5"
    >
      <MessageCircle size={22} strokeWidth={2.2} fill="currentColor" className="shrink-0" />
      <span className="hidden text-sm font-semibold sm:inline">Chat on WhatsApp</span>
    </a>
  );
}

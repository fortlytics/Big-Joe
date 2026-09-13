'use client';

import { useState } from 'react';
import { Link2, Check, Share2, MessageCircle } from 'lucide-react';
import type { Car } from '@/lib/types';
import { buildCarEnquiryLink } from '@/lib/whatsapp';

interface ShareBarProps {
  car: Car;
  /** Full absolute URL to this car's page — needed because it's what gets
   * copied/shared, and what makes the link work for whoever it's shared with. */
  permalink: string;
}

export function ShareBar({ car, permalink }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API is unavailable (very old browser, or non-HTTPS
      // context). We don't fall back to document.execCommand — it's
      // deprecated and unreliable — so the user is told plainly instead.
      window.prompt('Copy this link:', permalink);
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${car.year} ${car.brand} ${car.model} — Big Joe Autos`,
          text: `Check out this ${car.year} ${car.brand} ${car.model} at Big Joe Autos.`,
          url: permalink,
        });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 rounded-md border border-edge bg-surface2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue-glow/60"
      >
        {copied ? <Check size={16} className="text-ok" /> : <Link2 size={16} />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>

      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 rounded-md border border-edge bg-surface2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue-glow/60 sm:hidden"
      >
        <Share2 size={16} /> Share
      </button>

      <a
        href={buildCarEnquiryLink(car, permalink)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        <MessageCircle size={16} /> Ask on WhatsApp
      </a>
    </div>
  );
}

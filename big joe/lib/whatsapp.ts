import type { Car } from './types';
import { formatNaira } from './csv';

/** Dealer WhatsApp number in international format, no + or spaces
 * (this is what wa.me requires). Set via env so it's changeable without
 * a code edit. */
export const DEALER_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '2348181597529';
export const DEALER_PHONE_DISPLAY = process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? '0818 159 7529';

/** Builds a wa.me click-to-chat link — the officially documented WhatsApp
 * deep-link format (api.whatsapp.com/send and wa.me both work; wa.me is the
 * shorter, current recommended form). No app-specific SDK or Business API
 * needed for a simple pre-filled chat open. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${DEALER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Pre-filled enquiry message for a specific car, including its permalink
 * so the dealer immediately knows which vehicle the lead is asking about,
 * and whoever they forward the chat to can tap straight back to the listing. */
export function buildCarEnquiryLink(car: Car, permalink: string): string {
  const message = [
    `Hi Big Joe Autos, I'm interested in the ${car.year} ${car.brand} ${car.model}`,
    `(${formatNaira(car.price)}).`,
    permalink,
  ].join(' ');
  return buildWhatsAppLink(message);
}

export function buildGeneralEnquiryLink(): string {
  return buildWhatsAppLink("Hi Big Joe Autos, I'd like to ask about your inventory.");
}

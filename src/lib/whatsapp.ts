import { BUSINESS } from "@/lib/constants";

/** Builds a wa.me link from the existing business WhatsApp number, with an optional prefilled message. */
export function whatsappUrl(message?: string): string {
  const intlNumber = BUSINESS.whatsapp.replace(/^0/, "233");
  return message
    ? `https://wa.me/${intlNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${intlNumber}`;
}

export const WHATSAPP_MESSAGES = {
  general: "Hello Kings Shop & Importation, I have a question.",
  notFound:
    "Hello Kings Shop & Importation, I couldn't find a product on your website. Can you help me source it?",
  wholesale:
    "Hello Kings Shop & Importation, I'm interested in wholesale sourcing from China. Can you help?",
} as const;

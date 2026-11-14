"use client";

import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl, WHATSAPP_MESSAGES } from "@/lib/whatsapp";

export function WhatsAppButton() {
  const pathname = usePathname();
  // The cart has a fixed checkout bar at the bottom on mobile, so sit above it there
  const aboveCheckoutBar = pathname === "/cart";

  return (
    <a
      href={whatsappUrl(WHATSAPP_MESSAGES.general)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg transition hover:brightness-95 h-12 w-12 justify-center md:h-auto md:w-auto md:px-4 md:py-3 ${
        aboveCheckoutBar
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6"
          : "bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-6"
      }`}
    >
      <FaWhatsapp className="h-6 w-6 shrink-0" />
      <span className="hidden md:inline text-sm font-medium">Chat with us</span>
    </a>
  );
}

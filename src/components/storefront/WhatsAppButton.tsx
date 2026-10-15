import { FaWhatsapp } from "react-icons/fa";
import { BUSINESS } from "@/lib/constants";

export function WhatsAppButton() {
  const intlNumber = BUSINESS.whatsapp.replace(/^0/, "233");

  return (
    <a
      href={`https://wa.me/${intlNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:brightness-95 transition"
      aria-label="Chat with us on WhatsApp"
    >
      <FaWhatsapp className="w-6 h-6" />
    </a>
  );
}

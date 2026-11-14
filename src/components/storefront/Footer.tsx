import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { HiOutlinePhone, HiOutlineMail, HiOutlineLocationMarker } from "react-icons/hi";
import { BUSINESS, SHIPPING_INFO } from "@/lib/constants";
import { whatsappUrl, WHATSAPP_MESSAGES } from "@/lib/whatsapp";

// General community group. Public on purpose, unlike the private shipping-updates group.
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/FgrVwqqlphWHemfTmFj64J?s=cl&p=a&iam=2";

export function Footer() {
  const hasSocials = Boolean(BUSINESS.instagram || BUSINESS.tiktok);

  return (
    <footer className="bg-navy-900 text-navy-200 mt-16">
      <div
        className={`max-w-6xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 gap-8 text-sm ${
          hasSocials ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        <div>
          <p className="font-display text-white text-lg uppercase">{BUSINESS.shortName}</p>
          <p className="text-[10px] text-turquoise-light tracking-[0.2em] uppercase mt-1 mb-3">
            {BUSINESS.tagline}
          </p>
          <p className="text-navy-300">{BUSINESS.description}</p>
        </div>

        <div className="space-y-2">
          <p className="text-white font-medium mb-2">Contact</p>
          {BUSINESS.phones.map((p) => (
            <p key={p} className="flex items-center gap-2">
              <HiOutlinePhone className="w-4 h-4 shrink-0" />
              <a href={`tel:${p}`} className="hover:text-white">{p}</a>
            </p>
          ))}
          <p className="flex items-center gap-2">
            <HiOutlineMail className="w-4 h-4 shrink-0" />
            <a href={`mailto:${BUSINESS.email}`} className="hover:text-white break-all">{BUSINESS.email}</a>
          </p>
          <p className="flex items-start gap-2 text-navy-300">
            <HiOutlineLocationMarker className="w-4 h-4 shrink-0 mt-0.5" /> {BUSINESS.location}
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href={whatsappUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded bg-[#25D366] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-95"
            >
              <FaWhatsapp className="h-5 w-5" />
              Chat with us
            </a>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <FaWhatsapp className="h-5 w-5" />
              Join our WhatsApp group
            </a>
          </div>
        </div>

        {hasSocials && (
          <div>
            <p className="text-white font-medium mb-2">Follow</p>
            {BUSINESS.instagram && <p>Instagram: {BUSINESS.instagram}</p>}
            {BUSINESS.tiktok && <p>TikTok: @{BUSINESS.tiktok}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-navy-400 space-y-2">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/faq" className="hover:text-white">FAQ</Link>
          <Link href="/policies" className="hover:text-white">Order Policies</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
        </div>
        <p>{SHIPPING_INFO.shortNote}</p>
        <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}

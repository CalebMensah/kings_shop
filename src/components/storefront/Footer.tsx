import Link from "next/link";
import { HiOutlinePhone, HiOutlineMail, HiOutlineLocationMarker } from "react-icons/hi";
import { BUSINESS, SHIPPING_INFO } from "@/lib/constants";

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
              <HiOutlinePhone className="w-4 h-4 shrink-0" /> {p}
            </p>
          ))}
          <p className="flex items-center gap-2">
            <HiOutlineMail className="w-4 h-4 shrink-0" /> {BUSINESS.email}
          </p>
          <p className="flex items-start gap-2 text-navy-300">
            <HiOutlineLocationMarker className="w-4 h-4 shrink-0 mt-0.5" /> {BUSINESS.location}
          </p>
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
        <div className="flex justify-center gap-4">
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

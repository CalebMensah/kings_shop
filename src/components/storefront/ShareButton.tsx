"use client";

import { useState } from "react";
import { HiOutlineShare, HiOutlineCheck, HiOutlineLink } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { BUSINESS } from "@/lib/constants";

export function ShareButton({ productName, productUrl }: { productName: string; productUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const shareText = `Check out ${productName} on ${BUSINESS.name}`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: productName, text: shareText, url: productUrl });
      } catch {
        // user cancelled the native share sheet — no action needed
      }
      return;
    }
    setShowFallback((prev) => !prev);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — fallback link still visible for manual copy
    }
  }

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-900 transition"
      >
        <HiOutlineShare className="w-4 h-4" />
        Share
      </button>

      {showFallback && (
        <div className="absolute left-0 top-full mt-2 bg-white border border-navy-100 rounded shadow-sm p-2 z-10 w-48">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 text-sm text-navy-700 hover:bg-navy-50 rounded"
          >
            <FaWhatsapp className="w-4 h-4 text-turquoise-dark" />
            Share on WhatsApp
          </a>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-navy-700 hover:bg-navy-50 rounded"
          >
            {copied ? (
              <HiOutlineCheck className="w-4 h-4 text-turquoise-dark" />
            ) : (
              <HiOutlineLink className="w-4 h-4 text-navy-400" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { BUSINESS } from "@/lib/constants";
import { HiOutlineShoppingBag, HiOutlineMenu, HiOutlineX, HiOutlineQuestionMarkCircle } from "react-icons/hi";
import { FiTruck, FiInfo } from "react-icons/fi";

const NAV_LINKS = [
  { label: "Shop", href: "/shop", icon: HiOutlineShoppingBag },
  { label: "Track order", href: "/track-order", icon: FiTruck },
  { label: "FAQ", href: "/faq", icon: HiOutlineQuestionMarkCircle },
  { label: "About", href: "/about", icon: FiInfo },
];

export function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-navy-100 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex flex-col leading-none" onClick={() => setMenuOpen(false)}>
          <span className="font-display text-xl text-navy-900 uppercase">{BUSINESS.shortName}</span>
          <span className="text-[9px] text-turquoise-dark tracking-[0.2em] uppercase mt-1 hidden sm:block">
            {BUSINESS.tagline}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-navy-600">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-navy-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-navy-900" aria-label="Cart">
            <HiOutlineShoppingBag className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-turquoise-dark text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          <button
            className="md:hidden text-navy-900"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-navy-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-sm text-navy-700 px-2 py-2.5 rounded hover:bg-navy-50"
              >
                <Icon className="w-5 h-5 text-navy-400" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { BUSINESS } from "@/lib/constants";
import {
  HiOutlineViewGrid,
  HiOutlineShoppingBag,
  HiOutlineClipboardList,
  HiOutlineTag,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineCollection
} from "react-icons/hi";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/dashboard", icon: HiOutlineViewGrid },
  { label: "Products", href: "/admin/products", icon: HiOutlineShoppingBag },
  { label: "Categories", href: "/admin/categories", icon: HiOutlineTag },
  { label: "Batches", href: "/admin/batches", icon: HiOutlineCollection },
  { label: "Orders", href: "/admin/orders", icon: HiOutlineClipboardList },
  { label: "Analytics", href: "/admin/analytics", icon: HiOutlineChartBar },
  { label: "Settings", href: "/admin/settings", icon: HiOutlineCog },
];

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-navy-900 text-white flex items-center justify-between px-4 z-50">
        <span className="font-display text-base">{BUSINESS.shortName}</span>
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <HiOutlineMenu className="w-6 h-6" />
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-60 shrink-0 bg-navy-900 text-white flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display text-lg leading-tight">{BUSINESS.shortName}</p>
            <p className="text-xs text-turquoise-light mt-0.5">{BUSINESS.tagline}</p>
          </div>
          <button className="md:hidden text-navy-300" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                  active ? "bg-white/10 text-white" : "text-navy-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <p className="px-3 text-xs text-navy-300 mb-2">Signed in as {adminName}</p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-navy-100 hover:bg-white/10 hover:text-white transition"
            >
              <HiOutlineLogout className="w-5 h-5" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
